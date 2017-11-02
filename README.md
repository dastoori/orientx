# orientx

An OrientDB development tools

**Features**

- Create a database from one or more schema files. its support:
  - Creating one or more databases
  - Creating sequence
  - Creating function
  - Creating schedule
  - Creating cluster
  - Creating class and edge class
  - Creating class properties
  - Creating index
- Migration
- Beautiful and meaningful logs and errors
- It's easy to use

![orientx-logs](https://user-images.githubusercontent.com/2003143/31325827-49ef8fa0-acce-11e7-8a4a-4d0e819294eb.png)

**NOTE:** Only works in `node@>=8.3.0` (or `node@>=8.0.0` with `--harmony` flag) because of "async/await" and "object spread properties" support

## Index
- [Install](#install)
- [Usage](#usage)
  - [OrientDB server configuration](#orientdb-server-configuration)
    - [1. CLI options](#1-cli-options)
    - [2. Environment variables](#2-environment-variables)
    - [3. orientx configuration file](#3-orientx-configuration-file)
  - [Create a database](#create-a-database)
  - [Drop a database](#drop-a-database)
  - [Migration](#migration)
- [Credit](#credit)
- [License](#license)

## Install

You can install it in your project:

```shell
$ npm i orientx
# or
$ yarn add orientx
```

and use it in `scripts` property of the `package.json`, like this:

```json
{
  "scripts": {
    "create-db": "orientx db:create ./schema.yaml",
    "drop-db": "orientx db:drop MyDatabase",
    "migrate": "orientx migrate"
  }
}
```

or install it globally:

```shell
$ npm i -g orientx
# or
$ yarn global add orientx
```

and use it like this:

```shell
$ orientx --help
```

## Usage

```sh
Usage:  <command> [options]

Options:

  -V, --version              output the version number
  -c, --config <config>      orientx configuration file
  --odb-host <host>          orientdb server host
  --odb-port <port>          orientdb server port
  --odb-username <username>  orientdb server username
  --odb-password <password>  orientdb server password
  -h, --help                 output usage information


Commands:

  db:create|dbc <schema>  create database structure from one or more schemas
  db:drop|dbd <name...>   drop one or more database
  migrate|m [options]     database migration
```

### OrientDB server configuration

By default orientx uses the following configuration to connect to the OrientDB server:

```json
{
  "host": "localhost",
  "port": 2424,
  "username": "root"
}
```

You can set OrientDB server password or other configuration using the following ways:

#### 1. CLI options

```shell
  --odb-host <host>          orientdb server host
  --odb-port <port>          orientdb server port
  --odb-username <username>  orientdb server username
  --odb-password <password>  orientdb server password
```

#### 2. Environment variables

- `ORIENTDB_HOST`
- `ORIENTDB_PORT`
- `ORIENTDB_USERNAME`
- `ORIENTDB_PASSWORD`

#### 3. orientx configuration file

If you installed orientx in your project, you can create an `.orientxrc.yaml` file and place it in your project's root directory to be automatically loaded (`.orientxrc.json` and `.orientxrc.js` are also supported)

Also, you can set orientx configuration file manually using `--config` option:

```shell
  -c, --config <config>      orientx configuration file
```

Sample configuration file:

```yaml
db:
  host: localhost
  port: 2424
  username: root
  password: xxxxx
  type: graph             # [optional]
  storage: plocal         # [optional]
  lightweightEdges: true  # [optional]
```

### Create a database

You can use the following command to create a database from a schema file (supported formats: `.yaml`, `.yml`, `.json` or `.js`)

```shell
$ orientx db:create ./schema.yaml
# or
$ orientx dbc ./schema-*
```

or you can use [node-glob pattern](https://github.com/isaacs/node-glob#glob-primer) (you must use quotations)

```shell
$ orientx db:create './**/schema-@(db1|db2).{yaml,json}'
```

#### Schema

```yaml
---
# Database config
db:
  name: MyDatabase
  type: graph             # [optional]
  storage: plocal         # [optional]
  username: admin         # [optional]
  password: admin         # [optional]
  lightweightEdges: true  # [optional]

# Sequence
# https://orientdb.com/docs/last/SQL-Create-Sequence.html
sequence:
  id: ordered
  foobarId:
    name: foobarId  # [optional, autoPick]
    type: cached
    start: 1000     # [optional]
    incr: 10        # [optional]
    cache: 5        # [optional]

# Function
# https://orientdb.com/docs/last/SQL-Create-Function.html
function:
  fooFn: print('fooFn')
  barFn:
    name: barFn           # [optional, autoPick]
    code: print('barFn')
    parameters: [aa, bb]  # [optional]
    idempotent: true      # [optional]
    language: sql         # [optional]

# Schedule
# https://orientdb.com/docs/last/Scheduler.html
schedule:
  cleanup:
    name: cleanup                          # [optional, autoPick]
    rule: 0/1 * * * * ?
    function: barFn
    arguments:                             # [optional]
      a: 1
      b: 2
    startTime: '2017-02-05T23:59:20.252Z'  # [optional] Parse with `new Date()`

# Cluster
# https://orientdb.com/docs/last/SQL-Create-Cluster.html
cluster:
  us: null
  asia: 201
  europe:
    name: europe
    id: 202

# Class
class:
  User:
    # https://orientdb.com/docs/last/SQL-Create-Class.html
    name: User             # [optional, autoPick]
    parent: V              # [optional]
    abstract: false        # [optional]
    cluster: 201,202       # [optional]
    
    # Class properties
    # https://orientdb.com/docs/last/SQL-Create-Property.html
    props:
      id:
        type: Integer
        default: '"sequence(''id'').next()"'  # [optional]

      name: String
      surname: String
      
      username:
        type: String
        mandatory: true        # [optional]
        readonly: true         # [optional]
        regexp: '"[a-z.-_]+"'  # [optional]
        min: 3                 # [optional]
        max: 40                # [optional]

      createdAt: Datetime

      friend:
        type: Link
        linkedClass: User     # [optional]
        notNull: true         # [optional]

      foobar:
        type: EmbeddedMap
        linkedType: Integer   # [optional]

    # Class index
    # https://orientdb.com/docs/last/SQL-Create-Index.html
    index:
      User.id: UNIQUE_HASH_INDEX

      User.nameAndSurname:
        name: User.nameAndSurname     # [optional]
        type: FULLTEXT ENGINE LUCENE
        class: User                   # [optional, autoPick]
        properties: [name, surname]   # [optional, autoPick] `autoPick` only works when
                                      #   the index name is like `[CLASS_NAME].[PROPERTY_NAME]`
# Edge class (same as class)
edge:
  following: E
    
  follow:
    name: follow          # [optional, autoPick]
    parent: E             # [optional, autoPick]

    # Edge class properties (same as class properties)
    props:                # [optional]
      out:
        type: Link
        linkedType: User  # [optional]
      in:
        type: Link
        linkedType: User  # [optional]
      at: Datetime

# Global index (same as class index)
# https://orientdb.com/docs/last/SQL-Create-Index.html
index:
  User.createdAt: NOTUNIQUE

---
# You can have multiple schema in one yaml file

# Database config
db:
  name: MyDatabase2
```

### Drop a database

You can drop the database for development purpose using following command:

```shell
$ orientx db:drop MyDatabase
# or
$ orientx dbd MyDatabase MyDatabase2
```

### Migration

The `migrate` command is just a proxy to the `node-migrate`, [see the documentation here](https://github.com/tj/node-migrate#usage)

Difference:

- New template file that imports `orientx/db` and uses async/await syntax
- `orientx/db` is a module that uses the server configuration that you set [in the previous sections](#orientdb-server-configuration) and exports pre-configured `orientjs` instance. also, it exports `getServer()` and `orientjs`

Template file:

```javascript
const db = require('orientx/db')('DB_NAME');

exports.up = async () => {
  // await db.query(...);
};

exports.down = async () => {
  // await db.query(...);
};
```

## Credit

[node-migrate](https://github.com/tj/node-migrate) by @tj, used in `migrate` command


## License

MIT © 2017 Rasool Dastoori