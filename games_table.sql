CREATE TABLE games
(
  id INT NOT NULL
  AUTO_INCREMENT,
  nameGame VARCHAR
  (255) COLLATE utf8mb4_unicode_ci NOT NULL,
  releaseDate DATE NOT NULL,
  isPurchased TINYINT
  (1) NOT NULL,
  PRIMARY KEY
  (id)
);