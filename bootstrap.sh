#!/bin/bash
# intended for setting up services on ec2 instance together
set -e

# install git
sudo yum install git -y

git clone https://github.com/hwdnoz/1337helper.git

cd 1337helper

git checkout local-run

# install make
sudo yum install make -y

# TODO: copy over variables
cp .env.example .env

# install python venv
cd backend-python

python3 -m venv venv

source venv/bin/activate

pip install -r requirements.txt

deactivate

# install node/npm via nvm
cd ../frontend

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm install --lts

# fix ownership in case sudo commands affected it
sudo chown -R "$USER:$USER" .

npm install

echo "Installation complete!"
