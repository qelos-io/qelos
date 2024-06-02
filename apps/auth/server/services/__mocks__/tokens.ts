export const verifyToken = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    tokenIdentifier: 'mock-token',
  });
});

export const getUniqueId = jest.fn().mockImplementation(() => Math.random() + ':unique-id');

export const setCookie = jest.fn().mockImplementation((res, token) => {
  res.cookie('mock', token)
  return res;
})

export const getSignedToken = jest.fn().mockImplementation((user) => {
  return {
    token: 'mock-token',
    payload: user
  }
})