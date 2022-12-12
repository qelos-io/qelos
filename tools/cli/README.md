# Qelos CLI

A command-line interface to help you create and manage your Qelos application / website.

## Installation
> npm install -g @qelos/cli

## Commands
* **help**: provides information about all the supported commands
  usage: qelos h, qelos --help

* **version**: provides information about installed cli's version
  usage: qelos -V, qelos --version

* **start**: starts app
  usage: qelos start [mode [-l, --local= \<services\>][-x, --exclude = \<services\>][-d, --debug]]
  options:
    * mode: choose developer (input: dev) or user (no input required) application mode
      * local: if in dev mode and would like to run one of the key services (auth, secretes, assets, content, admin, front) from your local dev folder (my-app/dev), use the local option. E.g.:
	  > qelos start dev -l assets,front
      > qelos start dev --local=assets,front
    * exclude: choose which services not to start. In production, the default will be to exclude the db service. E.g:
      	> qelos start -x none
    * debug: keeps the start process alive and display live application logs

* **stop**: shuts down app
  usage: qelos stop

* **upgrade**: compares local dependencies version with latest Qelos version, allow user to upgrade local dependencies on will
  usage: qelos upgrade

* **create**: create a new app using qelos
  usage: qelos create [name] [type] [altFront] [mode]
  options:
    * name: choose app name
    * type: choose developer (input: pm2) or user (no input required) packages
    * altFront: choose alternative app frontend source (input: alternative frontend source's url)
    * mode: choose developer (input: dev) or user (no input required) mode

* **populate**: create initial content and admin user for your app
  usage: qelos populate

* **missing**: checks if dependencies are install. If not, provides an installation link for them, else, displays their version number.
  usage: qelos missing

* **service**: handles actions for easier development of services
  usage: qelos service [action] [services]
  supported services: auth, admin, assets, secrets, content, front
  supported actions:
  * create: creates a dev folder (if doesn't exist) and clones the requested services into it
      options:
      * -b/--branch <branch_name>: clones the services immeditaly to the requested branch (**if multiple services are requested, all must have the same branch name**)

