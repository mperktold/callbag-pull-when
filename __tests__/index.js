import forEach from 'callbag-for-each'
import fromIter from 'callbag-from-iter'
import pipe from 'callbag-pipe'
import subject from 'callbag-subject'

import pullWhen from '../src'

test('works', () => {
  const actual = []
  let next

  const sampler = subject()

  pipe(
    fromIter([10, 20, 30, 40, 50]),
    pullWhen(sampler),
    forEach(data => {
      actual.push(data)
    }),
  )

  return Promise.resolve()
    .then(() => {
      expect(actual).toEqual([])
    })
    .then(() => sampler(1, 0))
    .then(() => {
      expect(actual).toEqual([10])
    })
    .then(() => sampler(1, 1))
    .then(() => sampler(1, 2))
    .then(() => {
      expect(actual).toEqual([10, 20, 30])
    })
    .then(() => sampler(1, 3))
    .then(() => {
      expect(actual).toEqual([10, 20, 30, 40])
    })
    .then(() => sampler(1, 4))
    .then(() => {
      expect(actual).toEqual([10, 20, 30, 40, 50])
    })
})

test('works with pullable sampler', () => {
  const actual = []

  const samplerPulls = []
  const samplerSubject = subject()
  const sampler = (start, sink) => {
    if (start !== 0) return
    sink(0, (t, d) => {
      if (t === 1) samplerPulls.push(d)
    })
    samplerSubject(0, (t, d) => {
      if (t === 1) sink(1, d)
    })
  }

  pipe(
    fromIter([10, 20, 30]),
    pullWhen(sampler),
  )(0, (t, d) => {
    if (t === 1) actual.push(d)
  })

  expect(actual).toEqual([])
  samplerSubject(1)
  for (let i = 1; i <= 3; i++) {
    expect(samplerPulls).toEqual([10 * i])
    samplerSubject(1, samplerPulls.pop())
  }
  expect(actual).toEqual([10, 20, 30])
})

test('does not pull sampler after it terminated', () => {
  const actual = []

  const sampler = (start, sink) => {
    if (start !== 0) return
    let terminated = false
    sink(0, (t, d) => {
      expect(terminated).toBeFalsy()
      terminated = true
      if (t !== 2) sink(2)
    })
    sink(1)
  }

  pipe(
    fromIter([1, 2]),
    pullWhen(sampler),
  )(0, (t, d) => {
    if (t === 1) actual.push(d)
  })

  expect(actual).toEqual([1])
})

test('terminates sampler when source terminated', () => {
  const actual = []
  let sourceTerminated = false
  let samplerTerminated = false

  const sampler = (start, sink) => {
    if (start !== 0) return
    sink(0, (t, d) => {
      expect(samplerTerminated).toBeFalsy()
      if (t === 2) samplerTerminated = true
      sink(t, d)
    })
    sink(1)
  }

  let talkback
  pipe(
    fromIter([1, 2]),
    pullWhen(sampler),
  )(0, (t, d) => {
    if (t === 0) talkback = d
    if (t === 1) {
      actual.push(d)
      sourceTerminated = true
      talkback(2)
    }
  })

  expect(sourceTerminated).toBeTruthy()
  expect(samplerTerminated).toBeTruthy()
  expect(actual).toEqual([1])
})

test('terminates source when sampler terminated', () => {
  const actual = []
  let sourceTerminated = false
  let samplerTerminated = false

  const sampler = (start, sink) => {
    if (start !== 0) return
    sink(0, (t, d) => {
      expect(samplerTerminated).toBeFalsy()
      if (t === 1) {
        samplerTerminated = true
        sink(2)
      } else sink(t, d)
    })
    sink(1)
  }

  pipe(
    fromIter([1, 2]),
    pullWhen(sampler),
  )(0, (t, d) => {
    if (t === 1) actual.push(d)
    if (t === 2) sourceTerminated = true
  })

  expect(sourceTerminated).toBeTruthy()
  expect(samplerTerminated).toBeTruthy()
  expect(actual).toEqual([1])
})
