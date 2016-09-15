import HAR from 'har'

export function transformHeaders (headers) {
    const ret = []

    for (let key in headers) {
        let header = headers[key]

        if (typeof header !== 'string') {
            header = JSON.stringify(header)
        }

        ret.push(new HAR.Header({
            name: key,
            value: header
        }))
    }

    return ret
}
