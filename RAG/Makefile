.PHONY: help install run build-index evaluate clean test

help:
	@echo "Hieren AI RAG Backend - Available Commands"
	@echo "=========================================="
	@echo "  make install      - Install dependencies"
	@echo "  make run          - Start FastAPI server"
	@echo "  make build-index  - Build Pinecone index from data/"
	@echo "  make evaluate     - Run evaluation test suite"
	@echo "  make test         - Run tests (currently empty)"
	@echo "  make clean        - Clean cache and temporary files"

install:
	pip install -r requirements.txt

run:
	uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload

build-index:
	python -m app.builder

evaluate:
	python -m eval.evaluate_rag

test:
	pytest tests/ -v

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf dist build
