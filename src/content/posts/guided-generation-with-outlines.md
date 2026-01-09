---
title: Guided Generation with Outlines
date: 2024-05-13
summary: A walkthrough of Outlines and finite-state machines for constrained LLM generation, with regex and Pydantic examples.
tags: [llm, outlines, structured-generation, pydantic, regex]
---

_Originally published on Medium: https://medium.com/canoe-intelligence-technology/guided-generation-with-outlines-c09a0c2ce9eb_

While the ML community is busy arguing about whether next-word prediction is a genuine path to AGI, others have focused on making that next word the one that we actually want.

## Background

[In their paper](https://arxiv.org/pdf/2307.09702.pdf), Brandon Willard and Remi Louf describe how neural text generation can be reframed as transitions between the states of a finite-state machine. Outlines tackles the problem of guided LLM generation under rigid formatting requirements, which is a problem every engineer in the space has faced, particularly when working with JSON generation.

Existing implementations like Guidance by Microsoft use the probabilities of the next tokens in an LLM's vocabulary, but this approach involves repeated evaluations over the entire vocabulary to determine which next token meets the constraints given the previously generated tokens. This approach entails a fixed O(N) cost for each token generated, where N is the size of the LLM's vocabulary.

Outlines introduces an approach that uses a finite-state machine (FSM) formulation of regular expressions to efficiently start and stop text generation at any point and to quickly access a list of all possible next characters with a non-zero chance of appearing. This technique allows for constant-time (O(1)) performance on average for each step of the generation process.

![Screenshot showing the FSM idea](/posts/guided-generation-with-outlines/Screenshot_2024-04-06_at_12.07.24.png)

The example in the paper illustrates this point well and makes it a bit more tangible.

For simplicity, we are working with a vocabulary which consists of only the following strings:

```text
"A", ".", "42", ".2", "1"
```

Our constrained expression is to only allow floating point numbers to be returned and is defined by the following regular expression:

```text
([0-9]*)?\.?[0-9]*
```

The resulting FSM can be described by this diagram. A floating point number has to start at `State 0`, where either a number needs to be generated or a `.`. If a number is generated, we move to `State 1` where the next element in the sequence can either be another number (recursively) or a `.`. If a `.` is generated we move to `State 2` where a number needs to be generated to create a valid floating point number, at which point we move to `State 3`. Once we generate a number, we can add more digits to the floating point iteratively.

![FSM state diagram](/posts/guided-generation-with-outlines/Untitled.png)

When building the FSM from our starting vocabulary, `A` is masked as it does not meet the constraints implied by the expression. Only `.`, `42`, `.2`, and `1` are valid starting points for the generation.

If we start at `.2`, we jump to `State 2` and only `42` and `1` are valid tokens to move to `State 3`.

If we start at `1`, we start at `State 0`; `1` and `42` are valid tokens to get us to `State 1`, and `.` is a valid token to get us to `State 2`.

![Token transitions](/posts/guided-generation-with-outlines/Screenshot_2024-04-06_at_12.38.21.png)

Looping through the vocabulary to determine valid future states would still be a large computational overhead. The power of Outlines comes from the fact that the FSM is pre-computed given the constraints and an index of state transitions is created. The index is pulled in at runtime to constrain the next token generation without the need to recompute conditional probabilities and can be used as a mask over the sample of next tokens the model is already generating.

## Code Walkthrough

Let's reframe the example in the paper as a potential business problem an engineer may have been tasked to work on. We're working on a project where we want to extract nutritional information from unstructured text in product descriptions.

For example, our scraper has returned the following two pages and extracted the product descriptions:

```text
Chocolate flavour nutritionally complete drink with sweetener

Features include:

20g protein

26 vitamins & minerals

Plant-based

Low sugar

Gluten-free

Kosher certified - KLBD

100% nutritionally complete meal

This isn't just a protein drink. Huel Ready-to-drink is the most convenient meal you'll ever have - a meal in a bottle with all the nutrients you need.

Huel (Human + Fuel) launched in 2015 with a mission: "to make nutritionally complete, convenient, affordable food, with minimal impact on animals and environment." Huel's convenient approach to plant-based nutrition has seen it sell over 350 million meals worldwide.

Huel meals provide the right amount of protein, essential fats, carbohydrates, fibre and vitamins & minerals as part of a balanced diet.
```

and

```text
3g sugars, 10.3g protein, 54 kcal per 100g

No added sugar - contains naturally occurring sugars

Pronounced: Fa-Yeh!

Made with only milk and yoghurt cultures

High in protein

Source of calcium

Gluten-free

Additive and preservative free

Vegetarian Society Approved

Green Dot

Vegetarian Society Approved
```

We're going to write an extraction function to pull out the amount of protein in the descriptions in a consistent floating point format followed by a `g`. A simplified version of what we just saw in the paper is described by the regex `\d+\.\d+g`.

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
import outlines
from outlines import models, generate, samplers

model_name = "mistralai/Mistral-7B-Instruct-v0.2"  # substitute your model here

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
)

model = models.transformers(model_name, model_kwargs={"quantization_config": bnb_config})

# We will be using a seed to ensure this notebook is reproducible.
rng = torch.Generator(device="cuda")
rng.manual_seed(789001)
```

First let's inspect the FSM generated by outlines.

![Finite state machine](/posts/guided-generation-with-outlines/finite_state_machine.svg)

We can also see these states in the code. First we define the generator we will use for our guided generation using outlines.

```python
regex_generator = generate.regex(
    model,
    r"\d+\.\d+g"
)
```

A generator in `outlines` always has an `fsm`, which is what is used under the hood to traverse the states.

In our case `regex_generator.fsm.get_next_instruction(0)` gives us the first set of tokens which are allowed to be generated given our constraints. To view the whole sequence to match the diagram above we can run:

```python
print(
    f"State 0 -> 1: Permitted next tokens: "
    f"{regex_generator.tokenizer.decode(regex_generator.fsm.get_next_instruction(0).tokens)}"
)
print(
    f"State 0 -> 0 or 0 -> 1: Permitted next tokens: "
    f"{regex_generator.tokenizer.decode(regex_generator.fsm.get_next_instruction(1).tokens)}"
)
print(
    f"State 1 -> 1 or 1 -> 2: Permitted next tokens: "
    f"{regex_generator.tokenizer.decode(regex_generator.fsm.get_next_instruction(2).tokens)}"
)
print(
    f"State 2 -> 2 or 2 -> 3: Permitted next tokens: "
    f"{regex_generator.tokenizer.decode(regex_generator.fsm.get_next_instruction(3).tokens)}"
)

# Example output:
# State 0 -> 1: Permitted next tokens: ['7', '5', '9', '0', '0', '5', '2', '4', '1', '6', '6', '3', '4', '2', '8', '9', '8', '1', '7', '3']
# State 0 -> 0 or 0 -> 1: Permitted next tokens: ['7', '5', '9', '0', '0', '5', '2', '4', '1', '6', '6', '3', '4', '2', '8', '9', '8', '1', '.', '.', '7', '3']
# State 1 -> 1 or 1 -> 2: Permitted next tokens: ['2', '8', '9', '8', '1', '7', '3', '5', '9', '0', '7', '0', '5', '4', '2', '1', '6', '6', '3', '4']
# State 2 -> 2 or 2 -> 3: Permitted next tokens: ['2', '8', '9', '8', '1', '7', 'g', '3', '5', '9', '0', '7', '0', '5', '4', '2', '1', '6', '6', 'g', '3', '4']
```

An important thing to note about this approach is that we can in fact generate structured text without passing in a prompt. Guided generation just works. However, if we want to apply this properly to get the best possible performance, combining structured generation with a clear prompt is a better option. We'll make use of `outlines.prompt`, which has a nice set of [prompt formatting functionality](https://outlines-dev.github.io/outlines/reference/prompting/).

```python
@outlines.prompt
def product_description_prompt(product_description):
    """
    Context:
    {{product_description}}

    How much protein is in the given product description?

    Output:
    """

example_product_1 = """Chocolate flavour nutritionally complete drink with sweetener \n Features include: \n 20g protein \n 26 vitamins & minerals \n Plant-based \n Low sugar \n Gluten-free \n Kosher certified - KLBD \n 100% nutritionally complete meal \n This isn't just a protein drink. Huel Ready-to-drink is the most convenient meal you'll ever have - a meal in a bottle with all the nutrients you need. \n Huel (Human + Fuel) launched in 2015 with a mission: to make nutritionally complete, convenient, affordable food, with minimal impact on animals and environment. Huel's convenient approach to plant-based nutrition has seen it sell over 350 million meals worldwide. \n Huel meals provide the right amount of protein, essential fats, carbohydrates, fibre and vitamins & minerals as part of a balanced diet."""
example_product_2 = """3g sugars, 10.3g protein, 54 kcal per 100g \n No added sugar - contains naturally occurring sugars \n Pronounced: Fa-Yeh! \n Made with only milk and yoghurt cultures \n High in protein \n Source of calcium \n Gluten-free \n Additive and preservative free \n Vegetarian Society Approved \n Green Dot \n Vegetarian Society Approved"""

examples = [example_product_1, example_product_2]
prompts = [product_description_prompt(example) for example in examples]
```

Then we can run each prompt through the constrained generator to get our structured output:

```python
results = [regex_generator(prompt, rng=rng) for prompt in prompts]
print(results)
# ['20.0g', '10.3g']
```

Notice that we have gotten exactly the outcome that we prescribed in the generator, but our prompt doesn't have these specificities, or any death threats or passive aggressive constraints to the LLM.

We have effectively split instructions and output formatting in a deterministic way.

## Pydantic is all you need

A number of packages have built on top of the idea that [Pydantic](https://docs.pydantic.dev/latest/) is the structured Python layer that we should be building LLM applications on top of (see this great talk by [Jason Liu](https://www.youtube.com/watch?v=yj-wSRJwrrc) on how Pydantic is all you need).

I for one have no desire to learn regex to constrain my LLM generation. Thankfully the folks at Outlines have created an abstraction around Pydantic models to convert the resulting models to regex to constrain the generation process.

The implementation is simple:

```python
from pydantic import BaseModel, Field
from typing import Optional

class Nutrition(BaseModel):
    protein: float = Field(description="Amount of protein in the product, as it is in the text")
    calories: Optional[int] = Field(description="Number of calories in the product, as it is in the text")

pydantic_generator = generate.json(model, Nutrition)
results = [pydantic_generator(prompt, rng=rng) for prompt in prompts]

# [Nutrition(protein=20.0, calories=None), Nutrition(protein=10.3, calories=54)]
```

You'll see that the result is a `Pydantic Model`, with which you can apply further validations, post processing, generate computed fields, etc.

Outlines also allows you to take control of the sampling approach used. For example, if you wanted to penalize your generation for using the same tokens often, you can customize your sampler, or if you wanted to add a `beam_search` sampling approach you can easily implement this additional step in your pipeline.

```python
# We can use beam search to generate more than one output per generation
sampler = samplers.beam_search(beams=3)

beam_generator = generate.json(model, Nutrition, sampler)
results = [beam_generator(prompt, rng=rng) for prompt in prompts]

print(results)
```

This also works with nested Pydantic models, allowing for a clean data model design using Pydantic models, simple prompts, custom samplers and structured FSMs to create more deterministic LLM applications.

![Structured generation with nested models](/posts/guided-generation-with-outlines/Untitled%201.png)

This generic approach to data generation allows us to have more control over each element in our pipeline to create complex user facing and business critical applications built on top of LLMs.

Thanks for reading!

All the code shown in this blog post can be run on Colab:

[Google Colaboratory](https://colab.research.google.com/drive/17iMqUhv0bMNeqsjEvRF9wVMdFXTo6YgF#scrollTo=8fnA2tD1sXSU)

If you enjoyed this post, follow me on [Twitter](https://twitter.com/Kayvane) where I'll be posting more about building LLM powered applications.

Don't forget to star Outlines: https://github.com/dottxt-ai/outlines
