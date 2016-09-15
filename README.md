Remotedriver
============

The [Webdriver](https://www.w3.org/TR/webdriver/) protocol allows us to do so much things on the page. From clicking on a button to checking attributes on elements. Everything that is going on under the hood of the browser is not disclosed. These information can be useful though in order to provide tests with more feedback from the page or automate metrics like performance. Remotedriver is an experimental project that tries to run Selenium with a parallel connection to the Remote Debugging Protocol to make the underlying browser API accessible for debugging.

## Install

To set up the project just run

```sh
$ npm install
```

Also when executing the example you need to have a Selenium Standalone server running. You will find the latest jar file [here](http://goo.gl/EUxR76).

## Demo

In the root directory you can find an [example](example.js) file that runs a Selenium script and monitors metric as well as CPU usage of the app. Just run:

```sh
$ node example.js
```

which creates a

- __profile.har__: This file contains all information about requests and responses when accessing the app (google.com). To see the content and all request just go to [Googles Har Analyzer](https://toolbox.googleapps.com/apps/har_analyzer/) and select this har file.
- __profile.cpuprofile__: While putting a query into Google's search bar the script tracked the cpu usage of the browser which can be used as performance benchmarks. By opening Chromes Devtools, going to the "Profiles" tab and loading that file you can see which function have been performance heavy during that action.

## Next Steps

- [x] Run Chrome with Selenium and an open connection to the remote debugging protocol - Done!
- [ ] Same for Firefox
- [ ] Same for Safari
- [ ] Run Selenium with a remote connection to an iOS Simulator
