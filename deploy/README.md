Hello, world!

"Hello, world!" projects are a common starting point for developers learning new languages or platforms, as it provides a simple demonstration of how a programming language can be written for an application.

This application's logic is written in Motoko, a programming language designed specifically for developing canisters on ICP.

Deploying from ICP Ninja
When viewing this project in ICP Ninja, you can deploy it directly to the mainnet for free by clicking "Run" in the upper right corner. Open this project in ICP Ninja:



Project structure
The /backend folder contains the Motoko canister, app.mo. The /frontend folder contains web assets for the application's user interface. The user interface is written with plain JavaScript, but any frontend framework can be used.

Edit the mops.toml file to add Motoko dependencies to the project.

Build and deploy from the command-line
To migrate your ICP Ninja project off of the web browser and develop it locally, follow these steps. These steps are necessary if you want to deploy this project for long-term, production use on the mainnet.

1. Download your project from ICP Ninja using the 'Download files' button on the upper left corner under the pink ninja star icon.
2. Open the BUILD.md file for further instructions.

Local development with custom network

1. Configure a system-wide custom network (optional but recommended):
   - Find networks.json path: `dfx info networks-json-path`
   - Add a network like:
```
{
  "myNetwork1": {
    "bind": "localhost:4943",
    "replica": { "subnet_type": "application" }
  }
}
```
2. From this folder:
```
./deploy_local.sh myNetwork1
```
This will start the replica, deploy canisters, print the backend canister id, and write `.env.local` at the project root for the frontend.
