from flask import render_template, send_from_directory
from . import main
from .. import db

@main.route('/')
def index():
    return render_template('index.html')

