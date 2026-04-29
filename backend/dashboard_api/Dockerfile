FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir flask==3.0.3 pyjwt[crypto]==2.9.0 cryptography==43.0.1

COPY app.py .

EXPOSE 8090
CMD ["python", "-u", "app.py"]
