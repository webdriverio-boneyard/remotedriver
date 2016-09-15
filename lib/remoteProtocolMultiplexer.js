/**
 * This code was adapted from crmux and rewritten to serve the purposes of this project
 * https://www.npmjs.org/package/crmux
 * @author sidorares <https://github.com/sidorares>
 */

import http from 'http'
import bl from 'bl'
import url from 'url'
import WebSocket from 'ws'
import colors from 'colors'

import { getLogger } from 'appium-logger'
const log = getLogger('Multiplexer')

const DEFAULT_REMOTE_BROWSER_PORT = 12000
const DEFAULT_DEBUGGER_PORT = 9223

export default class RemoteProtocolMultiplexer {
    constructor (remoteDebuggerPort = DEFAULT_DEBUGGER_PORT, remoteBrowserPort = DEFAULT_REMOTE_BROWSER_PORT) {
        this.lastId = 0
        this.upstreamMap = {}
        this.cachedWsUrls = {}

        this.remoteDebuggerPort = remoteDebuggerPort
        this.remoteBrowserPort = remoteBrowserPort
    }

    initializeServer () {
        return http.createServer((req, res) => {
            log.info(`Received request for ${req.url}`)
            if (req.url === '/json' || req.url === '/json/list') {
                return this.cacheJson(req, res)
            }

            const options = {}
            options.port = this.remoteBrowserPort
            options.path = req.url
            http.request(options, (upRes) => {
                upRes.pipe(res)
            }).end()
        })
    }

    cacheJson (req, res) {
        return http.request({
            port: this.remoteBrowserPort,
            path: req.url
        }, (upRes) => upRes.pipe(bl((e, data) => {
            if (e) {
                log.errorAndThrow(e)
            }

            let tabs
            try {
                tabs = JSON.parse(data.toString())
            } catch (e) {
                log.error('Can\'t parse response: ', data.toString())
                log.error(e)
                return
            }

            let wsUrl, urlParsed
            for (let tab of tabs) {
                wsUrl = tab.webSocketDebuggerUrl

                if (typeof wsUrl === 'undefined') {
                    wsUrl = this.cachedWsUrls[tab.id]
                }

                if (typeof wsUrl === 'undefined') {
                    continue
                }

                urlParsed = url.parse(wsUrl, true)
                urlParsed.port = this.remoteDebuggerPort

                delete urlParsed.host
                tab.webSocketDebuggerUrl = url.format(urlParsed)

                if (tab.devtoolsFrontendUrl) {
                    tab.devtoolsFrontendUrl = tab.devtoolsFrontendUrl.replace(wsUrl.slice(5), tab.webSocketDebuggerUrl.slice(5))
                }

                // console.log(tabs[i].devtoolsFrontendUrl, wsUrl, tabs[i].webSocketDebuggerUrl)
                // TODO: cache devtoolsFrontendUrl as well
                this.cachedWsUrls[tab.id] = wsUrl
            }

            log.info(`Response for ${req.url}`, tabs)
            res.end(JSON.stringify(tabs))
        }))).end()
    }

    /**
     * register listener and broadcast messages to registered clients
     */
    createNewUpstreamSocket (wsUpstreamUrl) {
        const upstreamSocket = new WebSocket(wsUpstreamUrl)
        upstreamSocket.on('message', (message) => {
            const msgObj = JSON.parse(message)

            /**
             * this is an event, broadcast it
             */
            if (!msgObj.id) {
                const clientCnt = this.upstreamMap[wsUpstreamUrl].clients.length
                log.info(`broadcast message to ${clientCnt}:`, colors.cyan(message))
                this.upstreamMap[wsUpstreamUrl].clients.forEach((s) => s.send(message))
            } else {
                const idMap = this.upstreamMap[wsUpstreamUrl].localIdToRemote[msgObj.id]
                msgObj.id = idMap.id

                log.info(colors.blue(String(idMap.client._id)) + '> ' + colors.yellow(idMap.message))
                log.info(colors.blue(String(idMap.client._id)) + '> ' + colors.green(JSON.stringify(msgObj)))

                idMap.client.send(JSON.stringify(msgObj))
                delete this.upstreamMap[wsUpstreamUrl].localIdToRemote[msgObj.id]
            }
        })

        return upstreamSocket
    }

    handleSocketConnection (ws) {
        ws._id = this.lastId++

        let urlParsed = url.parse(ws.upgradeReq.url, true)
        urlParsed.protocol = 'ws:'
        urlParsed.slashes = '//'
        urlParsed.hostname = 'localhost'
        urlParsed.port = this.remoteBrowserPort

        delete urlParsed.query
        delete urlParsed.search
        delete urlParsed.host

        const wsUpstreamUrl = url.format(urlParsed)
        log.info(`Socket upstream url ${wsUpstreamUrl}`)

        let upstreamSocket
        if (!this.upstreamMap[wsUpstreamUrl]) {
            log.info('Adding new upstream socket to upstream map')
            upstreamSocket = this.createNewUpstreamSocket(wsUpstreamUrl)
            this.upstreamMap[wsUpstreamUrl] = {
                localId: 0,
                socket: upstreamSocket,
                clients: [ws],
                localIdToRemote: {}
            }
        } else {
            log.info('upstream socket already exists, adding socket client')
            upstreamSocket = this.upstreamMap[wsUpstreamUrl].socket
            this.upstreamMap[wsUpstreamUrl].clients.push(ws)
        }

        ws._upstream = upstreamSocket
        ws._upstream.params = this.upstreamMap[wsUpstreamUrl]

        ws.on('message', (message) => {
            const upstream = ws._upstream

            let msgObj
            try {
                msgObj = JSON.parse(message)
            } catch (e) {
                log.error(e)
                return
            }

            const local = ++upstream.params.localId
            const remote = msgObj.id
            msgObj.id = local
            upstream.params.localIdToRemote[local] = {
                client: ws,
                id: remote,
                message: message
            }

            if (upstream.readyState === 0) {
                return upstream.once('open', () => upstream.send(JSON.stringify(msgObj)))
            }
            upstream.send(JSON.stringify(msgObj))
        })

        ws.on('close', () => {
            // TODO:
            // var upstream = ws._upstream
            // for each key in upstream.params.localIdToRemote
            // delete all keys where ws._id = key.client._id

            const purged = this.upstreamMap[wsUpstreamUrl].clients.filter((s) => s._id !== ws._id)
            this.upstreamMap[wsUpstreamUrl].clients = purged
        })
    }

    start () {
        log.info(`create server listening to ${this.remoteDebuggerPort}`)
        this.server = this.initializeServer()
        this.server.listen(this.remoteDebuggerPort)

        log.info('initialize socket connection')
        this.wss = new WebSocket.Server({server: this.server})
        this.wss.on('connection', ::this.handleSocketConnection)
    }
}
