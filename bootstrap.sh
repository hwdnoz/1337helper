#!/bin/bash
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

# install redis
sudo dnf install redis6 -y

sudo ln -s /usr/bin/redis6-server /usr/bin/redis-server

# install rabbitmq
sudo tee /etc/yum.repos.d/rabbitmq.repo <<'EOF'
[modern-erlang]
name=modern-erlang
baseurl=https://yum1.rabbitmq.com/erlang/el/9/$basearch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key
gpgcheck=1

[rabbitmq-server]
name=rabbitmq-server
baseurl=https://yum1.rabbitmq.com/rabbitmq/el/9/noarch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key
gpgcheck=1
EOF

sudo dnf install -y rabbitmq-server

sudo systemctl start rabbitmq-server

sudo rabbitmqctl add_user "1337helper" "1337helper"

sudo rabbitmqctl set_permissions -p / "1337helper" ".*" ".*" ".*"

sudo rabbitmqctl set_user_tags "1337helper" administrator

# install python venv
cd backend-python

python3 -m venv venv

source venv/bin/activate

pip install -r requirements.txt

deactivate

# install npm
cd ../frontend

export NVM_DIR="$HOME/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install --lts

npm install

echo "Installation complete!"
