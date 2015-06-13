exports.gen_json = gen_json;

function gen_json (code, desc, data) {
  return {'code': code,
          'desc': desc,
          'data': data ? data : {}};
}
