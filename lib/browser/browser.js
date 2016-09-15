import tmp from 'tmp'

const REMOTE_BROWSER_DEBUGGER_PORT = 12000

export default class Browser {
    constructor (host, port) {
        this.host = host
        this.port = port
        this.remoteBrowserPort = REMOTE_BROWSER_DEBUGGER_PORT
        this.tmpDir = tmp.dirSync()
    }

    async start () { throw new Error('NYI') }
    recordNetworkLog () { throw new Error('NYI') }
    stopRecordNetworkLog () { throw new Error('NYI') }
    profileCPU () { throw new Error('NYI') }
    async stopCPUProfiling () { throw new Error('NYI') }
    shutdown () { throw new Error('NYI') }
}
