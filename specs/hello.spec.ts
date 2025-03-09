import { describe, it, mock } from 'node:test'
// @ts-ignore
import { expect } from 'chai'
import { hello } from '../src/hello' // your module with hello()

// Attach hello() to an object so we can use test.mock.method:
const myModule = { hello }

describe('hello function', () => {
  it('should return the correct greeting and record the call', async (test) => {
    const helloSpy = test.mock.method(myModule, 'hello')
    const result = myModule.hello('Alice')
    expect(result).to.equal('Hello Alice')
    expect(helloSpy.mock.calls.length).to.equal(1)
    expect(helloSpy.mock.calls[0].arguments).to.deep.equal(['Alice'])
  })
})