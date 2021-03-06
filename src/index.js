export default function pullWhen(sampler) {
  return pullable => (start, sink) => {
    if (start !== 0) return

    let pullableTalkback
    let samplerTalkback
    let terminated = false

    pullable(0, (type, data) => {
      if (type === 0) {
        pullableTalkback = data

        sink(0, end => {
          if (end !== 2) return

          terminated = true
          pullableTalkback(2)
          samplerTalkback(2)
        })
        if (terminated) return

        sampler(0, (type, data) => {
          if (type === 0) {
            samplerTalkback = data
            return
          }

          if (type === 1) {
            pullableTalkback(1)
            return
          }

          if (type === 2) {
            terminated = true
            pullableTalkback(2)
            sink(2)
            return
          }
        })
        return
      }

      if (type === 1) {
        sink(1, data)
        if (!terminated) samplerTalkback(1, data)
        return
      }

      if (type === 2) {
        terminated = true
        samplerTalkback(2)
        sink(2)
        return
      }
    })
  }
}
