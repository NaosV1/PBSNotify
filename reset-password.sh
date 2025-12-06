#!/bin/bash

# Script pour réinitialiser le mot de passe PBS Notify

cd "$(dirname "$0")/backend"
node reset-password.js
