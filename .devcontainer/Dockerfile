# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.183.0/containers/ruby/.devcontainer/base.Dockerfile

# [Choice] Ruby version: 3, 3.0, 2, 2.7, 2.6
ARG VARIANT="trixie"
FROM mcr.microsoft.com/devcontainers/base:${VARIANT}


# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    zlib1g

RUN dpkg --add-architecture amd64
RUN apt update
RUN apt install -y libc6:amd64

# [Optional] Uncomment this line to install global node packages.
# RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && npm install -g <your-package-here>" 2>&1

RUN curl -fsSL https://starship.rs/install.sh | sh -s -- --yes 
RUN echo "eval \"\$(starship init bash)\"" >> /home/vscode/.bashrc && echo "eval \"\$(starship init zsh)\"" >> /home/vscode/.zshrc

USER vscode

# RUN curl https://mise.run | sh
# RUN echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
# RUN echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc

