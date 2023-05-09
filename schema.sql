DROP TABLE IF EXISTS module;

CREATE TABLE module (
   name VARCHAR(50) PRIMARY KEY,
   type VARCHAR(20) NOT NULL,
   repo_id INT NOT NULL,
   owner VARCHAR(255) NOT NULL,
   repo VARCHAR(255) NOT NULL,
   description TEXT,
   star_count INT NOT NULL,
   is_unlisted INT(1) NOT NULL,
   latest_version_id INTEGER,
   created_at VARCHAR(255) NOT NULL,
   FOREIGN KEY (latest_version_id) REFERENCES module_version(id) ON DELETE
   SET
      NULL
);

DROP TABLE IF EXISTS bad_words;

CREATE TABLE bad_words (word VARCHAR(50) PRIMARY KEY);

INSERT INTO
   bad_words (word)
VALUES
   ('admin'),
   ('root'),
   ('system'),
   ('config'),
   ('provider'),
   ('core'),
   ('official'),
   ('std'),
   ('mashin'),
   ('settings'),
   ('repository'),
   ('module');

DROP TABLE IF EXISTS build;

CREATE TABLE build (
   id VARCHAR(200) PRIMARY KEY,
   module VARCHAR(50) NOT NULL,
   version VARCHAR(20) NOT NULL,
   status VARCHAR(20) NOT NULL,
   message VARCHAR(255) NOT NULL,
   created_at VARCHAR(255) NOT NULL
);

DROP TABLE IF EXISTS module_version;

CREATE TABLE module_version (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   module VARCHAR(50) NOT NULL,
   entrypoint TEXT NOT NULL,
   major INTEGER NOT NULL,
   minor INTEGER NOT NULL,
   patch INTEGER NOT NULL,
   windows_x86 INTEGER NOT NULL,
   macos_x86 INTEGER NOT NULL,
   linux_x86 INTEGER NOT NULL,
   readme TEXT,
   doc TEXT,
   created_at VARCHAR(255) NOT NULL,
   FOREIGN KEY (module) REFERENCES module(name) ON DELETE CASCADE
);