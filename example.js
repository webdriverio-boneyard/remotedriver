var Chrome = require('./build/browser/chrome')
var browser = new Chrome('localhost', 9223)

var client = require('webdriverio').remote({
    desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
            debuggerAddress: 'localhost:9223'
        }
    }
})

client
    /**
     * initialise browser, starts Chrome browser, proxy and remote debugger instance
     */
    .call(browser.start.bind(browser))
    /**
     * attach Selenium session to Chrome browser
     */
    .init()
    /**
     * start network profiling
     */
    .call(() => browser.recordNetworkLog())
    /**
     * open google.com
     */
    .url('http://google.com')
    /**
     * stop network profiling, store HAR file on fs
     * start cpu profiling
     */
    .call(() => browser.stopRecordNetworkLog('profile.har'))
    .call(() => browser.profileCPU())
    /**
     * interact with the page
     */
    .setValue('#lst-ib', 'WebdriverIO')
    .pause(1000) // let the page render
    /**
     * stop profiling and save .cpuprofile file
     */
    .call(() => browser.stopCPUProfiling('profile.cpuprofile'))
    /**
     * stop selenium session and kill Chrome
     * because we attached the session to the browser it can't kill Chrome by itself
     */
    .end().then(() => browser.shutdown())
