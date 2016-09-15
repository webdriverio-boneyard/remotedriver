import tmp from 'tmp'

export default class Browser {
    constructor (port) {
        this.port = port
        this.tmpDir = tmp.dirSync()
    }

    async start () {
        throw new Error('NYI')
    }
}
