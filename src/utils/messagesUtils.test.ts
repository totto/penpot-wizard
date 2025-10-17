import { describe, it, expect } from 'vitest'
import { parseJsonMarkdown } from './messagesUtils'

describe('parseJsonMarkdown - Real cases', () => {
  it('no fences: partial object {" -> should create valid JSON (object)', () => {
    const input = '{"'
    const result = parseJsonMarkdown(input)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('object')
  })

  it('fenced with json label and newline', () => {
    const input = '```json\n{"a": 1}\n```'
    const result = parseJsonMarkdown(input)
    expect(result).toEqual({ a: 1 })
  })

  it('fenced with json label without newline', () => {
    const input = '```json{"a":2}```'
    const result = parseJsonMarkdown(input)
    expect(result).toEqual({ a: 2 })
  })

  it('fenced without language label', () => {
    const input = '```\n{"b": 3}\n```'
    const result = parseJsonMarkdown(input)
    expect(result).toEqual({ b: 3 })
  })

  it('ignores trailing content after closing fence', () => {
    const input = 'prefix text ```json\n{"c": 4}\n``` and some trailing notes'
    const result = parseJsonMarkdown(input)
    expect(result).toEqual({ c: 4 })
  })

  it('handles trailing backslash at end of string inside fences', () => {
    const input = '```json\n{"text":"To draw a triangle:\\"\n```'
    const result = parseJsonMarkdown(input)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('object')
    // Ensure string property exists
    // @ts-ignore - runtime check
    expect(result.text).toBeTypeOf('string')
  })

  it('non-JSON input returns null', () => {
    const input = 'hello world'
    const result = parseJsonMarkdown(input)
    expect(result).toBeNull()
  })

  it('empty object input returns empty object', () => {
    const input = '{}'
    const result = parseJsonMarkdown(input)
    expect(result).toEqual({})
  })
})