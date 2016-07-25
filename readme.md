This is the code for transforming raw sync gzipped protobuf heka logs from the s3 archives into json format "rows" for insertion into redshift.

## Transformation

The transform code is `defaults/transforms.js`. The main exported function takes a parsed heka message and outputs a json string representing a row for redshift. All other functions in this file are just helpers to convert the data into the form we want.

Here's the schema for the log tables:

```sql
create table sync0715
(
  uid CHAR(32) NOT NULL encode lzo,
  s_uid CHAR(32) encode lzo,
  dev CHAR(32) NOT NULL encode lzo,
  s_dev CHAR(32) encode lzo,
  ts TIMESTAMP NOT NULL encode lzo,
  method VARCHAR(32) encode lzo,
  code SMALLINT encode lzo,
  bucket VARCHAR(255) encode bytedict,
  t INTEGER encode bytedict,
  ua_browser VARCHAR(255) encode lzo,
  ua_version INTEGER encode lzo,
  ua_os VARCHAR(255) encode lzo,
  host VARCHAR(255) encode lzo
)
distkey(uid)
interleaved sortkey(uid, dev);
```

## Execution

`bin/transform.js` is the main executable. It takes several flags, mainly the input and output s3 bucket paths. `-s` splits the output into files of the specified size. The command I use currently looks something like this:

```sh
node bin/transform.js -i s3://heka-logs/shared/$i -o s3://dcoates-sync-dev-rollup -s 600mb
```

`lib` contains all the internal magic.

### Loading

A `COPY` command loads the data into redshift. It looks something like:

```sql
copy sync0715 from 's3://dcoates-sync-dev-rollup/2016/07/15' credentials 'XXX' gzip timeformat 'epochmillisecs' json 'auto';
```

## Rollups

After a daily table has been loaded, a few sql commands do rollups of the data.

### Device Activity

This table summarizes a day of request activity per device id.

```sql
create table device_activity
(
  uid char(32) not null encode lzo,
  dev char(32) not null encode lzo,
  ua_os varchar(8) encode bytedict,
  ua_browser varchar(16) encode lzo,
  ua_version integer encode lzo,
  day date not null encode delta,
  min_t integer encode bytedict,
  max_t integer encode lzo,
  posts integer encode lzo,
  gets integer encode lzo,
  puts integer encode lzo,
  dels integer encode lzo,
  aoks integer encode lzo,
  oops integer encode lzo,
  fups integer encode lzo,
  r_clients integer encode lzo,
  r_crypto integer encode lzo,
  r_forms integer encode lzo,
  r_history integer encode lzo,
  r_keys integer encode lzo,
  r_meta integer encode lzo,
  r_bookmarks integer encode lzo,
  r_prefs integer encode lzo,
  r_tabs integer encode lzo,
  r_passwords integer encode lzo,
  r_addons integer encode lzo,
  w_clients integer encode lzo,
  w_crypto integer encode lzo,
  w_forms integer encode lzo,
  w_history integer encode lzo,
  w_keys integer encode lzo,
  w_meta integer encode lzo,
  w_bookmarks integer encode lzo,
  w_prefs integer encode lzo,
  w_tabs integer encode lzo,
  w_passwords integer encode lzo,
  w_addons integer encode lzo
)
distkey(uid)
compound sortkey(day, uid);
```

And the query that inserts today's data.

```sql
insert into device_activity (
  select
    uid,
    dev,
    max(ua_os) as ua_os,
    max(ua_browser) as ua_browser,
    max(ua_version) as ua_version,
    trunc(max(ts)) as day,
    min(t) as min_t,
    max(t) as max_t,
    sum(posts) as posts,
    sum(gets) as gets,
    sum(puts) as puts,
    sum(dels) as dels,
    sum(aoks) as aoks,
    sum(oops) as oops,
    sum(fups) as fups,
    sum(r_clients) as r_clients,
    sum(r_crypto) as r_crypto,
    sum(r_forms) as r_forms,
    sum(r_history) as r_history,
    sum(r_keys) as r_keys,
    sum(r_meta) as r_meta,
    sum(r_bookmarks) as r_bookmarks,
    sum(r_prefs) as r_prefs,
    sum(r_tabs) as r_tabs,
    sum(r_passwords) as r_passwords,
    sum(r_addons) as r_addons,
    sum(w_clients) as w_clients,
    sum(w_crypto) as w_crypto,
    sum(w_forms) as w_forms,
    sum(w_history) as w_history,
    sum(w_keys) as w_keys,
    sum(w_meta) as w_meta,
    sum(w_bookmarks) as w_bookmarks,
    sum(w_prefs) as w_prefs,
    sum(w_tabs) as w_tabs,
    sum(w_passwords) as w_passwords,
    sum(w_addons) as w_addons
  from
  (select
    uid,
    dev,
    ts,
    t,
    decode(substring(ua_os,0,8), 'iPad', 'ios', 'iPod', 'ios', 'iPhone', 'ios', 'Android', 'android', 'Windows', 'windows', 'Macinto', 'mac', 'Linux', 'linux', null, 'unknown', 'other') as ua_os,
    ua_browser,
    ua_version,
    case when bucket = 'clients' and method = 'GET' then 1 end as r_clients,
    case when bucket = 'crypto' and method = 'GET' then 1 end as r_crypto,
    case when bucket = 'forms' and method = 'GET' then 1 end as r_forms,
    case when bucket = 'history' and method = 'GET' then 1 end as r_history,
    case when bucket = 'keys' and method = 'GET' then 1 end as r_keys,
    case when bucket = 'meta' and method = 'GET' then 1 end as r_meta,
    case when bucket = 'bookmarks' and method = 'GET' then 1 end as r_bookmarks,
    case when bucket = 'prefs' and method = 'GET' then 1 end as r_prefs,
    case when bucket = 'tabs' and method = 'GET' then 1 end as r_tabs,
    case when bucket = 'passwords' and method = 'GET' then 1 end as r_passwords,
    case when bucket = 'addons' and method = 'GET' then 1 end as r_addons,
    case when bucket = 'clients' and method = 'POST' then 1 end as w_clients,
    case when bucket = 'crypto' and method = 'POST' then 1 end as w_crypto,
    case when bucket = 'forms' and method = 'POST' then 1 end as w_forms,
    case when bucket = 'history' and method = 'POST' then 1 end as w_history,
    case when bucket = 'keys' and method = 'POST' then 1 end as w_keys,
    case when bucket = 'meta' and method = 'POST' then 1 end as w_meta,
    case when bucket = 'bookmarks' and method = 'POST' then 1 end as w_bookmarks,
    case when bucket = 'prefs' and method = 'POST' then 1 end as w_prefs,
    case when bucket = 'tabs' and method = 'POST' then 1 end as w_tabs,
    case when bucket = 'passwords' and method = 'POST' then 1 end as w_passwords,
    case when bucket = 'addons' and method = 'POST' then 1 end as w_addons r_history,
  from sync0715)
group by uid, dev);
```

### Device Counts

This table summarizes how many active devices each user had on a given day, where an active device is one that has had any activity in the last 7 days.

Schema:

```sql
create table device_counts
(
  uid CHAR(32) NOT NULL encode lzo,
  day DATE encode delta,
  devs SMALLINT encode lzo
)
distkey(uid)
compound sortkey(day, uid);
```

Query:

```sql
select
  uid,
  max(day) as day,
  count(distinct dev) as devs
from
  (select
    uid,
    dev,
    day
  from device_activity
  where uid in
    (select distinct(uid) from device_activity where day = '2016-07-14')
    and day > '2016-07-14' - 7
    and day < '2016-07-14' + 1)
group by uid;
```
