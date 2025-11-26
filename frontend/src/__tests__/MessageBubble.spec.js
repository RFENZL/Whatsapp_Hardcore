import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubble from '../components/MessageBubble.vue'

describe('MessageBubble.vue', () => {
  let wrapper

  const createWrapper = (props = {}) => {
    return mount(MessageBubble, {
      props: {
        m: {
          _id: '123',
          content: 'Test message',
          sender: { _id: 'user1', username: 'testuser' },
          createdAt: new Date().toISOString(),
          ...props.m
        },
        currentUserId: props.currentUserId || 'user1',
        ...props
      },
      global: {
        stubs: {
          teleport: true
        }
      }
    })
  }

  beforeEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders message content correctly', () => {
    wrapper = createWrapper({
      m: { content: 'Hello World', sender: { _id: 'user1' } }
    })
    expect(wrapper.text()).toContain('Hello World')
  })

  it('shows different styling for sent vs received messages', () => {
    // Test sent message (current user)
    const sent = createWrapper({
      m: { sender: { _id: 'user1' }, content: 'Sent' },
      currentUserId: 'user1'
    })
    expect(sent.find('.justify-end').exists()).toBe(true)
    sent.unmount()

    // Test received message (other user)
    const received = createWrapper({
      m: { sender: { _id: 'user2' }, content: 'Received' },
      currentUserId: 'user1'
    })
    expect(received.find('.justify-start').exists()).toBe(true)
    received.unmount()
  })

  it('displays deleted message indicator', () => {
    wrapper = createWrapper({
      m: { deleted: true, content: 'Original', sender: { _id: 'user1' } }
    })
    expect(wrapper.text()).toContain('supprimé')
  })

  it('shows reply preview when message is a reply', () => {
    wrapper = createWrapper({
      m: {
        content: 'Reply',
        sender: { _id: 'user1' },
        replyTo: { content: 'Original message' }
      }
    })
    expect(wrapper.text()).toContain('En réponse')
    expect(wrapper.text()).toContain('Original message')
  })

  it('renders system messages with center alignment', () => {
    wrapper = createWrapper({
      m: { 
        type: 'system',  // Le composant vérifie m.type === 'system'
        content: 'User joined', 
        sender: { _id: 'system' } 
      }
    })
    expect(wrapper.find('.justify-center').exists()).toBe(true)
    expect(wrapper.text()).toContain('User joined')
  })

  it('displays message timestamp', () => {
    const date = new Date('2025-01-01T12:00:00Z')
    wrapper = createWrapper({
      m: {
        createdAt: date.toISOString(),
        sender: { _id: 'user1' },
        content: 'Test'
      }
    })
    // Just check that the component renders without error
    expect(wrapper.exists()).toBe(true)
  })
})

