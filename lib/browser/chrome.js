import HAR from 'har'
import ChromeRemoteInterface from 'chrome-remote-interface'
import ChromeRunner from 'node-chrome-runner'
import { spawn } from 'child-process-promise'
import { getLogger } from 'appium-logger'
import { transformHeaders } from '../utils'
const log = getLogger('Chrome')

import Browser from './browser'
import RemoteProtocolMultiplexer from '../remoteProtocolMultiplexer'

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
const START_TIMEOUT = 3000

export default class Chrome extends Browser {
    constructor (port) {
        super(port)
        this.remoteBrowserPort = 12000
        this.multiplexer = new RemoteProtocolMultiplexer(this.port, this.remoteBrowserPort)
    }

    async start () {
        log.info('Start remote protocol multiplexer')
        this.multiplexer.start()

        const chromeArgs = FLAGS.concat([
            `--user-data-dir=${this.tmpDir.name}`,
            `--remote-debugging-port=${this.remoteBrowserPort}`
        ])
        log.info('Starting Chrome with args\n ', chromeArgs.join('\n  '))
        this.process = ChromeRunner.runChrome({
            versions: [ChromeRunner.chromePaths.stable],
            args: chromeArgs,
            processOptions: { stdio: ['pipe', 'pipe', 'pipe'] }
        })
        this.process.childProcess.stderr.on('data', (m) => log.error(m.toString()))
        this.process.childProcess.stdout.on('data', (m) => log.info(m.toString()))
        await new Promise((resolve) => setTimeout(resolve, START_TIMEOUT))

        log.info('Connecting to remote protocol ...')
        this.devtools = await new Promise((resolve) => ChromeRemoteInterface({
            host: 'localhost',
            port: this.port
        }, (devtools) => {
            log.info('Connected to remote protocol')
            resolve(devtools)
        }))

        return this.promise
    }

    recordNetworkLog () {
        /**
         * don't start record if network get already recorded
         */
        if (this.networkLoggingEnabled) {
            return
        }

        const entries = {}
        let pageCnt = 0
        this.networkLoggingEnabled = true

        this.harLog = new HAR.Log({
            version: 1.2,
            creator: new HAR.Creator({ name: 'Node HAR', version: '1.0' }),
            browser: new HAR.Browser({ name: 'Chrome', version: '48.0' }),
            comment: 'saucesome'
        }).addPage({
            id: ++pageCnt,
            title: 'via script',
            startedDateTime: new Date()
        })

        this.devtools.Network.requestWillBeSent((result) => {
            if (!this.networkLoggingEnabled) {
                return
            }

            log.info('Received browser request')
            const request = result.request
            request.headers = transformHeaders(request.headers)

            entries[result.requestId] = {
                startedDateTime: result.timestamp,
                request: new HAR.Request(request)
            }
        })

        this.devtools.Network.responseReceived(function (result) {
            if (!this.networkLoggingEnabled) {
                return
            }

            log.info('Received browser response')
            const response = result.response
            response.headers = transformHeaders(result.response)

            if (response.statusText === '') {
                response.statusText = 'OK'
            }

            this.devtools.Network.getResponseBody({ requestId: result.requestId }).then((data) => {
                response.content = new HAR.PostData({
                    text: data.body
                })

                entries[result.requestId].response = new HAR.Response(response)
                this.harLog.addEntry(entries[result.requestId])
            }, ::log.errorAndThrow)
        })
    }

    stopRecordNetworkLog () {
        this.networkLoggingEnabled = false
        return { log: this.harLog }
    }
}
