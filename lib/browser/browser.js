import tmp from 'tmp'

const REMOTE_BROWSER_DEBUGGER_PORT = 12000

export default class Browser {
    constructor (host, port) {
        this.host = host
        this.port = port
        this.remoteBrowserPort = REMOTE_BROWSER_DEBUGGER_PORT
        this.tmpDir = tmp.dirSync()
    }

    async start () {
        throw new Error('NYI')
    }
}
