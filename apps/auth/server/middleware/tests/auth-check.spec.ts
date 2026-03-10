import {onlyAuthenticated, onlyPrivileged} from '../auth-check';
import {getExpressResMock} from '../../../mocks/express-res.mock';
import {AuthRequest} from '../../../types';

describe('Auth Check middlewares', () => {
  describe('onlyAuthenticated', () => {
    describe('When get request without a valid user', () => {
      const emptyRequest: any = {};
      it('should response error to user', () => {
        const resMock = getExpressResMock();
        const nextMock = jest.fn();
        onlyAuthenticated(
          emptyRequest,
          resMock as any,
          nextMock
        );

        expect(resMock.status).toBeCalledWith(401);
        expect(resMock.json).toBeCalledWith({
          message: 'you are not authorized. must be logged in.',
        });
        expect(resMock.end).toBeCalled();
      });

      it('should not trigger next middleware', () => {
        const resMock = getExpressResMock();
        const nextMock = jest.fn();
        onlyAuthenticated(
          emptyRequest as AuthRequest,
          resMock as any,
          nextMock
        );

        expect(nextMock).not.toBeCalled();
      });
    });

    describe('When get request with a valid user', () => {
      const reqWithUser = {
        userPayload: {},
      };
      it('should continue to next middleware', () => {
        const resMock = getExpressResMock();
        const nextMock = jest.fn();

        onlyAuthenticated(reqWithUser as AuthRequest, resMock as any, nextMock);

        expect(nextMock).toBeCalled();
        expect(nextMock.mock.calls.length).toBe(1);

        // next function should be called with not arguments
        expect(nextMock.mock.calls[0][0]).toBeUndefined();
      });
    });
  });

  describe('onlyPrivileged', () => {
    describe('When request has no userPayload', () => {
      it('should respond with 401 and "not authorized" message', () => {
        const req: any = { headers: {}, url: '/api/test' };
        const resMock = getExpressResMock();
        const nextMock = jest.fn();

        onlyPrivileged(req, resMock as any, nextMock);

        expect(resMock.status).toBeCalledWith(401);
        expect(resMock.json).toBeCalledWith({
          message: 'you are not authorized. must be logged in.',
        });
        expect(resMock.end).toBeCalled();
        expect(nextMock).not.toBeCalled();
      });
    });

    describe('When request has userPayload but isPrivileged is false', () => {
      it('should respond with 401 and "not privileged" message', () => {
        const req: any = {
          userPayload: { isPrivileged: false },
          headers: { tenant: 'tenant-1' },
          url: '/api/test',
        };
        const resMock = getExpressResMock();
        const nextMock = jest.fn();

        onlyPrivileged(req, resMock as any, nextMock);

        expect(resMock.status).toBeCalledWith(401);
        expect(resMock.json).toBeCalledWith({
          message: 'you are not privileged.',
        });
        expect(resMock.end).toBeCalled();
        expect(nextMock).not.toBeCalled();
      });
    });

    describe('When request has userPayload with isPrivileged undefined', () => {
      it('should respond with 401', () => {
        const req: any = {
          userPayload: { roles: ['user'] },
          headers: { tenant: 'tenant-1' },
          url: '/api/test',
        };
        const resMock = getExpressResMock();
        const nextMock = jest.fn();

        onlyPrivileged(req, resMock as any, nextMock);

        expect(resMock.status).toBeCalledWith(401);
        expect(resMock.end).toBeCalled();
        expect(nextMock).not.toBeCalled();
      });
    });

    describe('When request has privileged userPayload', () => {
      it('should call next and not send a response', () => {
        const req: any = {
          userPayload: { isPrivileged: true },
        };
        const resMock = getExpressResMock();
        const nextMock = jest.fn();

        onlyPrivileged(req, resMock as any, nextMock);

        expect(nextMock).toBeCalled();
        expect(nextMock.mock.calls.length).toBe(1);
        expect(nextMock.mock.calls[0][0]).toBeUndefined();
        expect(resMock.status).not.toBeCalled();
      });
    });
  });
});
