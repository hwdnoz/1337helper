#!/bin/bash
# intended for setting up services on ec2 instance together
# bootstrap via source bootstrap.sh
set -e

mkdir Code

cd Code

# install git
sudo yum install git -y

git clone https://github.com/hwdnoz/1337helper.git

cd 1337helper

# install make
sudo yum install make -y

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

npm install

echo "Installation complete!"
