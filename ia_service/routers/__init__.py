# ia_service/routers/__init__.py
from .scoring import router as scoring_router
from .feedback import router as feedback_router

__all__ = ['scoring_router', 'feedback_router']