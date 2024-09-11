const request = require('supertest');
const { createApolloServer } = require('../app');
const { expect } = require('@jest/globals');
const { db } = require('../config/mongodb');
const { searchUser } = require('../models/user');

const queryDataRegist = {
  query: `mutation Register($form: UserForm!) {
    register(form: $form) {
      _id
      name
      username
      email
    }
  }`,
  variables: {
    form: {
      email: "abc@mail.com",
      name: "abc",
      password: "123123",
      username: "abc"
    }
  }
};

const queryDataFailRegistEmail = {
  query: `mutation Register($form: UserForm!) {
    register(form: $form) {
      _id
      name
      username
      email
    }
  }`,
  variables: {
    form: {
      email: "",
      name: "abc",
      password: "123123",
      username: "abcd"
    }
  }
};

const queryDataFailRegistPasswordMinLength = {
  query: `mutation Register($form: UserForm!) {
    register(form: $form) {
      _id
      name
      username
      email
    }
  }`,
  variables: {
    form: {
      email: "abcde@mail.com",
      name: "abc",
      password: "a",
      username: "abcde"
    }
  }
};

const queryDataFailRegistPassword = {
  query: `mutation Register($form: UserForm!) {
    register(form: $form) {
      _id
      name
      username
      email
    }
  }`,
  variables: {
    form: {
      email: "abcd@mail.com",
      name: "abc",
      password: "",
      username: "abcd"
    }
  }
};

const queryDataLogin = {
  query: `mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      _id
      email
    }
  }`,
  variables: {
    username: "abc",
    password: "123123"
  }
};

const queryDataFailLogin = {
  query: `mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      _id
      email
    }
  }`,
  variables: {
    username: "abc",
    password: "wrongpassword"
  }
};

const queryDataFailLoginPassword = {
  query: `mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      _id
      email
    }
  }`,
  variables: {
    username: "abc",
    password: ""
  }
};

const queryDataFailLoginUsername = {
  query: `mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      _id
      email
    }
  }`,
  variables: {
    username: "",
    password: "123123"
  }
};

const querySearchUser = {
  query: `
  query SearchUser($keywords: String) {
  searchUser(keywords: $keywords) {
    _id
    name
    username
    email
  }
}
  `,
  variables: {
    "keywords": "a"
  }
}

describe('User Authentication', () => {
  let server, url;

  beforeAll(async () => {
    ({ server, url } = await createApolloServer({ port: 0 }));
  });

  afterAll(async () => {
    await db.collection('User').deleteMany({});
    await server.stop();
  });

  describe('User Registration', () => {
    it('should successfully register a user', async () => {
      const response = await request(url).post('/').send(queryDataRegist);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.register).toBeDefined();
      expect(response.body.data.register).toMatchObject({
        _id: expect.any(String),
        name: "abc",
        username: "abc",
        email: "abc@mail.com"
      });
    });

    it('should fail registration due to empty email', async () => {
      const response = await request(url).post('/').send(queryDataFailRegistEmail);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Email cannot be empty");
    });

    it('should fail registration due to short password', async () => {
      const response = await request(url).post('/').send(queryDataFailRegistPasswordMinLength);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Password length min 5");
    });

    it('should fail registration due to empty password', async () => {
      const response = await request(url).post('/').send(queryDataFailRegistPassword);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Password cannot be empty");
    });

    it('should fail registration due to duplicate email', async () => {
      await request(url).post('/').send(queryDataRegist);
      const response = await request(url).post('/').send(queryDataRegist);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Username must be unique");
    });

    it('should fail registration due to duplicate username', async () => {
      const duplicateUsernameQuery = {
        ...queryDataRegist,
        variables: {
          form: {
            ...queryDataRegist.variables.form,
            email: "newuser@mail.com"
          }
        }
      };
      const response = await request(url).post('/').send(duplicateUsernameQuery);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Username must be unique");
    });
  });

  describe('User Login', () => {
    beforeAll(async () => {
      await request(url).post('/').send(queryDataRegist);
    });

    it('should successfully log in a user', async () => {
      const response = await request(url).post('/').send(queryDataLogin);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.login).toBeDefined();
      expect(response.body.data.login).toMatchObject({
        accessToken: expect.any(String),
        _id: expect.any(String),
        email: "abc@mail.com"
      });
    });

    it('should fail login due to wrong password', async () => {
      const response = await request(url).post('/').send(queryDataFailLogin);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Invalid password!");
    });

    it('should fail login due to empty password', async () => {
      const response = await request(url).post('/').send(queryDataFailLoginPassword);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Password is required!");
    });

    it('should fail login due to empty username', async () => {
      const response = await request(url).post('/').send(queryDataFailLoginUsername);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Email or Username is required!");
    });

    it('should fail login due to non-existent user', async () => {
      const nonExistentUserQuery = {
        ...queryDataLogin,
        variables: {
          username: "nonexistentuser",
          password: "123123"
        }
      };
      const response = await request(url).post('/').send(nonExistentUserQuery);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Sorry, User not found");
    });
  });
});

describe('User Search', () => {
  let accessToken;

  beforeAll(async () => {
    // Register and login the user to get the token
    ({ server, url } = await createApolloServer({ port: 0 }));
    await request(url).post('/').send(queryDataRegist);
    const loginResponse = await request(url).post('/').send(queryDataLogin);
    accessToken = loginResponse.body.data.login.accessToken;
  });

  it('should return a list of users matching the search keyword', async () => {
    const response = await request(url)
      .post("/")
      .set("Authorization", `Bearer ${accessToken}`) // Ensure proper authorization
      .send(querySearchUser);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.searchUser).toBeInstanceOf(Array);

    // Assert each user's structure
    response.body.data.searchUser.forEach(user => {
      expect(user).toMatchObject({
        _id: expect.any(String),
        name: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
      });
    });

    // Sample assertion for specific users
    expect(response.body.data.searchUser).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(String),
          name: expect.any(String),
          username: expect.any(String),
          email: expect.any(String),
        }),
      ])
    );
  });
});