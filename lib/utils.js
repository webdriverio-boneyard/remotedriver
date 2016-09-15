import HAR from 'har'

export function transformHeaders (headers) {
    const ret = []

    for (let key in headers) {
        ret.push(new HAR.Header({
            name: key,
            value: headers[key]
        }))
    }

    return ret
}
