# Histree

A history tracking tool for Jupyter Notebooks.
The purpose of Histree is to provide a JupyterLab extension that does tree-based history tracking with branching capabilities.

## Install
1. __Jupyterlab__: Histree works with > JupyterLab 3 (latest version). To install or update your JupyterLab: 
  * with pip: `pip install jupyterlab -U` 
  * with conda: `conda install -c conda-forge jupyterlab`
  * to check version: `jupyter lab --version`
  * _for windows users!_: due to a bug with lab extensions in earlier 3.0 releases, be sure you have >= `3.0.7` of JupyterLab
  * tested with JupyterLab version 3.0.X
2. __NodeJs__: JupyterLab needs node to configure and install extensions, not just Histree
  * to check if you have node installed `node --version`
  * to install: [Official NodeJS installers](https://nodejs.org/en/download/)
  * tested with NodeJS version 16.X.X
3. __Histree__:
  * To install Histree, you currently have to build it yourself from the source code. Once it is properly deployed, it will be possible to install Histree directly via the JupyterLab extension manager.
  * To build Histree from source code, execute the following commands in the source code directory:

```bash
yarn
yarn build
yarn start
```


4. After the installation, an icon appears in the JupyterLab sidebar which you can click to open the Histree interface.

## Known Issues
This is an experimental extension not yet properly released, and may contain bugs that could cause problems with your Jupyter Notebooks. Please use at your own risk. Here are a few issues that we are currently aware of:
* Reordering cells can sometimes cause issues with the history tracking
* Copy/Pasting of cells can cause similar problems