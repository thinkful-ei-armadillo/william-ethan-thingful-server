const bcrypt = require('bcryptjs');
const xss = require('xss');
const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/

const UsersService = {
  validatePassword(password) {

    if (password.length < 8) {
      return 'Password must be atleast 8 characters in length';
    }

    if (password.length > 72) {
      return 'Password must be at most 72 characters in length';
    }

    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces';
    }

    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain 1 upper case, lower case, number and special character';
    }

    return null;
  },

  hasUserWithUserName(db, user_name) {
    return db('thingful_users')
      .where({ user_name })
      .first()
      .then((user) => {
        return !!user;
      });
  },

  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into('thingful_users')
      .returning('*')
      .then(([user]) => {
        return user;
      });
  },

  hashPassword(password) {
    return bcrypt.hash(password, 12);
  },

  serializeUser(user) {
    return {
      id: user.id,
      full_name: xss(user.full_name),
      user_name: xss(user.user_name),
      nickname: xss(user.nick_name),
      date_created: user.date_created,
    };
  },
};

module.exports = UsersService;
