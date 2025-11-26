import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  api, 
  uploadFile, 
  getContacts, 
  addContact, 
  removeContact, 
  blockContact,
  getSessions,
  deleteSession,
  getGroup,
  updateGroup
} from '../lib/api';

describe('API Module', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('api() base function', () => {
    it('makes GET request with correct parameters', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' })
      });

      const result = await api('/test', { method: 'GET' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          })
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('includes Authorization header when token provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      await api('/protected', { method: 'GET', token: 'test-token' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('sends POST request with body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '123' })
      });

      const body = { name: 'test', value: 42 };
      await api('/create', { method: 'POST', body });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });

    it('throws error on non-ok response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Not found' }),
        statusText: 'Not Found'
      });

      await expect(api('/notfound')).rejects.toThrow();
    });
  });

  describe('Contact API functions', () => {
    it('getContacts() fetches user contacts', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { _id: '1', username: 'user1' },
          { _id: '2', username: 'user2' }
        ]
      });

      const result = await getContacts('token123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/contacts'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('addContact() adds a new contact', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      await addContact('token123', 'user456');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/contacts'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('blockContact() blocks a contact', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ blocked: true })
      });

      await blockContact('token123', 'user456');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/contacts/user456/block'),
        expect.any(Object)
      );
    });
  });

  describe('Session API functions', () => {
    it('getSessions() retrieves active sessions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { _id: '1', device: 'Chrome' },
          { _id: '2', device: 'Firefox' }
        ]
      });

      const result = await getSessions('token123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/sessions'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('deleteSession() removes a session', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      await deleteSession('token123', 'session456');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/sessions/session456'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Group API functions', () => {
    it('getGroup() fetches group details', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ _id: 'group123', name: 'Test Group' })
      });

      const result = await getGroup('token123', 'group123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/groups/group123'),
        expect.any(Object)
      );
      expect(result).toHaveProperty('name', 'Test Group');
    });

    it('updateGroup() modifies group settings', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      await updateGroup('token123', 'group123', { name: 'New Name' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/groups/group123'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('New Name')
        })
      );
    });
  });
});
