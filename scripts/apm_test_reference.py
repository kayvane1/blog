"""Standalone DDTrace + Modal test service with Datadog APM.

This is a complete, standalone example for integrating Datadog APM with Modal.
Uses structlog for structured logging with Modal context injection.

Deploy: MODAL_ENVIRONMENT=dev modal deploy apm_test_reference.py
Test:   MODAL_ENVIRONMENT=dev pytest test_apm_smoke.py -v -s

Requirements:
- Modal account with datadog_api_key secret configured
- DD_API_KEY set in the Modal secret
"""

import asyncio
import os
import random
from modal import App, Image, Secret, concurrent, enter, exit, method

# =============================================================================
# Configuration
# =============================================================================

app_name = "modal-apm-test"

# Datadog configuration - these become environment variables in the container
DD_SERVICE = app_name
DD_ENV = os.getenv("MODAL_ENVIRONMENT", "dev")
DD_VERSION = os.getenv("GIT_SHA", "1.0.0")
DD_SITE = os.getenv("DD_SITE", "datadoghq.com")
DD_TAGS = f"env:{DD_ENV},service:{DD_SERVICE}"

# =============================================================================
# Modal Image Definition
# =============================================================================

image = (
    Image.debian_slim(python_version="3.11")
    # Datadog serverless-init handles trace forwarding
    .dockerfile_commands(
        [
            "COPY --from=datadog/serverless-init /datadog-init /app/datadog-init",
            'ENTRYPOINT ["/app/datadog-init"]',
        ]
    )
    .pip_install(
        "ddtrace==4.1.2",
        "structlog>=24.0.0",
    )
    .env(
        {
            # Datadog APM Configuration
            "DD_SERVICE": DD_SERVICE,
            "DD_ENV": DD_ENV,
            "DD_SITE": DD_SITE,
            "DD_VERSION": DD_VERSION,
            "DD_TRACE_ENABLED": "true",
            "DD_LOGS_ENABLED": "true",
            "DD_LOGS_INJECTION": "true",
            "DD_RUNTIME_METRICS_ENABLED": "false",
            "DD_SOURCE": "modal",
            "DD_TAGS": DD_TAGS,
            # Sample rate: 1.0 = capture all traces (override agent's 10/sec limit)
            "DD_TRACE_SAMPLE_RATE": "1.0",
        }
    )
)

app = App(name=app_name, image=image)

# =============================================================================
# DDTrace + Structlog Initialization (runs at image import time)
# =============================================================================

with image.imports():
    import structlog
    from ddtrace import patch, tracer

    # Patch logging for trace ID injection
    patch(logging=True)

    def add_modal_context(logger, method_name, event_dict):
        """Add Modal runtime context to all log entries."""
        event_dict["modal"] = {
            "is_remote": os.getenv("MODAL_IS_REMOTE", "0"),
            "environment": os.getenv("MODAL_ENVIRONMENT", "unknown"),
            "region": os.getenv("MODAL_REGION", "unknown"),
            "task_id": os.getenv("MODAL_TASK_ID", "unknown"),
            "image_id": os.getenv("MODAL_IMAGE_ID", "unknown"),
        }
        return event_dict

    def add_datadog_context(logger, method_name, event_dict):
        """Add Datadog trace context for log correlation."""
        current_span = tracer.current_span()
        if current_span:
            event_dict["dd"] = {
                "trace_id": str(current_span.trace_id),
                "span_id": str(current_span.span_id),
                "service": current_span.service,
            }
        return event_dict

    # Configure structlog with Modal and Datadog context
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            add_modal_context,
            add_datadog_context,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logger = structlog.get_logger(__name__)


# =============================================================================
# Modal Service Class
# =============================================================================


@app.cls(secrets=[Secret.from_name("datadog_api_key")])
@concurrent(max_inputs=8)  # Reduced from 128 - allows better trace sampling (~10 traces/sec agent limit)
class TestService:
    """Example service demonstrating DDTrace integration with Modal.

    Key patterns demonstrated:
    - Span hierarchy (root + child spans)
    - Span types for UI categorization
    - Tags and metrics on spans
    - Explicit trace flushing for real-time visibility
    - Structured logging with trace correlation
    """

    @enter()
    def init(self) -> None:
        """Initialize the service (runs once per container cold start)."""
        with tracer.trace("modal.init", service=app_name, span_type="serverless"):
            logger.info("service_initializing", strategies=["mineru-vl", "dots-ocr"])
            self.strategies = ["mineru-vl", "dots-ocr"]
            logger.info("service_initialized")

    @method()
    async def process(self, document_id: str, strategy: str = "mineru-vl") -> dict:
        """Process a document with tracing and structured logging.

        Demonstrates:
        - Root span with span_type="serverless" and span.kind="server"
        - Child spans with appropriate types (template, llm)
        - Random latency simulation for observing outliers in APM
        - Explicit tracer.flush() in finally block for guaranteed trace emission
        """
        try:
            # Root span - the main operation (shows in trace list)
            with tracer.trace("document.process", service=app_name, span_type="serverless") as root:
                root.set_tag("document_id", document_id)
                root.set_tag("strategy", strategy)
                root.set_tag("span.kind", "server")  # Marks as entry point
                logger.info("processing_document", document_id=document_id, strategy=strategy)

                # Child span 1 - PDF rendering (5% chance of 5x slower for anomaly detection demo)
                with tracer.trace("document.render_pages", service=app_name, span_type="template") as render_span:
                    render_span.set_metric("pages_count", 10)
                    is_slow_render = random.random() < 0.05
                    render_time = 1.0 if is_slow_render else 0.2
                    render_span.set_tag("slow_render", is_slow_render)
                    await asyncio.sleep(render_time)
                    logger.info("rendered_pages", pages=10, slow=is_slow_render, duration_ms=int(render_time * 1000))

                # Child span 2 - LLM inference (10% chance of 3x slower for anomaly detection demo)
                with tracer.trace("document.llm_extract", service=app_name, span_type="llm") as llm_span:
                    llm_span.set_tag("model", "mineru-vl")
                    llm_span.set_metric("tokens_processed", 1500)
                    is_slow_llm = random.random() < 0.10
                    llm_time = 0.9 if is_slow_llm else 0.3
                    llm_span.set_tag("slow_llm", is_slow_llm)
                    await asyncio.sleep(llm_time)
                    logger.info("extracted_content", tokens=1500, slow=is_slow_llm, duration_ms=int(llm_time * 1000))

                # Set final metrics on root span
                root.set_metric("total_pages", 10)
                logger.info("document_processed_successfully")

            return {
                "document_id": document_id,
                "strategy": strategy,
                "status": "success",
                "pages": 10,
            }
        finally:
            # CRITICAL: Flush traces in finally block - guarantees traces are sent even on
            # early returns or exceptions. Without this, traces buffer until container
            # shutdown (which rarely happens with Modal's warm containers).
            tracer.flush()

    @exit()
    async def finish(self) -> None:
        """Cleanup on container shutdown (rarely called due to warm containers)."""
        with tracer.trace("modal.exit", service=app_name, span_type="serverless"):
            logger.info("service_shutting_down")
        tracer.shutdown()
        logger.info("tracer_shutdown_complete")


# =============================================================================
# Local Entrypoint for Testing
# =============================================================================


@app.local_entrypoint()
def main() -> None:
    """Test the service locally."""
    svc = TestService()
    result = svc.process.remote(document_id="test-doc-123", strategy="dots-ocr")
    print(f"Result: {result}")
