import os
from flask import Flask
import pyamal

app = Flask(__name__)

@app.route("/")
def index():
    try:
        config = pyamal.load(open("config.yml", "r"))
    except Exception:
        pass
    return "Welcome to the App!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
