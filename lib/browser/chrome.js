import { spawn } from 'child-process-promise'
import { getLogger } from 'appium-logger'
const log = getLogger('Chrome')

import Browser from './browser'
import RemoteProtocolMultiplexer from '../utils/remoteProtocolMultiplexer'

const FLAGS = [
    '--disable-background-networking',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-web-resources',
    '--ignore-certificate-errors',
    '--metrics-recording-only',
    '--no-first-run',
    '--password-store=basic',
    '--safebrowsing-disable-auto-update',
    '--safebrowsing-disable-download-protection',
    '--test-type=webdriver',
    '--use-mock-keychain',
    '--enable-logging=stdout'
]
const START_TIMEOUT = 10000

export default class Chrome extends Browser {
    constructor (port) {
        super(port)
        this.remoteBrowserPort = 12000
        this.multiplexer = new RemoteProtocolMultiplexer(this.port, this.remoteBrowserPort)
        this.defaultPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    }

    async run () {
        log.info('Start remote protocol multiplexer')
        this.multiplexer.start()

        const chromeArgs = FLAGS.concat([
            `--user-data-dir=${this.tmpDir.name}`,
            `--remote-debugging-port=${this.remoteBrowserPort}`
        ])
        log.info('Starting Chrome with args\n ', chromeArgs.join('\n  '))
        this.process = spawn(this.defaultPath, chromeArgs)

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Browser did not started after ${START_TIMEOUT}ms`)), START_TIMEOUT)
            this.process.childProcess.stderr.once('data', () => {
                clearTimeout(timeout)
                resolve()
            })
        })

        return this.promise
    }
}
