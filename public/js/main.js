$(function () {
  /* some utils */
  /* generate msg box according response status and code */
  function gen_msg_box(status, code, msg_map) {
    if (status === 'success') {
      msg = msg_map['success'][code]['msg'];
      msg_type = msg_map['success'][code]['type'];
    } else {
      msg = msg_map['fail']['msg'];
      msg_type = msg_map['fail']['type'];
    }

    var msg_box = '<div id="msg_box" class="row alert alert-dismissable alert-' + msg_type + '">' +
        '<button type="button" class="close" data-dismiss="alert"' +
        'aria-hidden="true">' +
        '&times;' +
        '</button>' +
        msg +
        '</div>';
    return $(msg_box);
  }

  function update_msg_box(status, code, msg_map) {
    if (status === 'success') {
      msg = msg_map['success'][code]['msg'];
      msg_type = msg_map['success'][code]['type'];
    } else {
      msg = msg_map['fail']['msg'];
      msg_type = msg_map['fail']['type'];
    }

    $('#msg_box')
      .removeClass('alert-success alert-info alert-warning alert-danger')
      .addClass('alert-' + msg_type)
      .contents()
      .filter(function () {
        return this.nodeType === 3;
      }).replaceWith(msg);
  }

  /* generate new empty fill-data panel */
  function new_empty_panel(initial) {
    var $panel = initial.clone(true);
    $panel.find('input[type=text]').each(function () {
      $(this).val('');
    });

    /* generate new panel with random id */
    $panel.attr('id', 'panel-' + Math.floor(Math.random(1) * 100000));
    return $panel;
  }


  /* index page */
  /* search bar */
  $('#search-box input').on('keyup', function () {
    var txt = $(this).val();
      $('#data-table>tbody tr').each(function () {
        if ($(this).text().toLowerCase().indexOf(txt) === -1 ){
          if ($(this).find(':checkbox').prop('checked')) {
            $(this).trigger('click');
          }
          $(this).hide();
        } else
          $(this).show();
      });
  });


  // row click event
  $('#data-table>tbody tr').bind('click', function () {
    $(this).find(':checkbox').trigger('click');
  });

  // select-all button
  $('#sel-all').click(function (e) {
    var $boxes = $('.edit-box>:checkbox:visible');
    $boxes.prop('checked', this.checked);
    $boxes.each(function () {
      if ($(this).prop('checked'))
        $(this).parents('tr').addClass('warning');
      else
        $(this).parents('tr').removeClass('warning');
    });
    $('#del-data.btn').text('删除(' + $('.edit-box>:checkbox:checked:visible').length + ')');
    e.stopPropagation();
  });

  /* save data button */
  $(document).on('click', '#save-data', function () {
    var data_rows = [];
    $('#data-table>tbody tr.changed').each(function () {
      if ( ! $(this).find('input.data-input').length) return;
      var row = {};
      $(this).find('td:gt(1)').each(function () {
        row[$(this).attr('class').split(' ')[0]] = $(this).find('input').val();
      });
      data_rows.push(row);
    });

    $.post('/modify', {'data': data_rows}, function (data, status) {
      var res_msg = {
        'fail': {
          msg: '网络错误',
          type: 'danger'
        },
        'success': {
          '200': {
            msg: '成功更新' + data_rows.length + '条数据',
            type: 'success'
          },
          '406': {
            msg: '数据更新失败',
            type: 'warning'
          },
          '503': {
            msg: '服务器错误',
            type: 'danger'
          },
          '403': {
            msg: '非法数据',
            type: 'danger'
          }
        }
      };

      /* show msg box */
      var msg_box = $('#msg_box');
      if (msg_box.length) {
        update_msg_box(status, data.code, res_msg);
      } else {
        $('#edit-line').after(gen_msg_box(status, data.code, res_msg));
      }

      /* if success then reload page */
      if (status === 'success' && data.code == '200'){
        location.reload();
      }
    });
  });

  /* edit button */
  $('#edit-data').click(function () {
    if ($(this).is('.active')) {
      $('.edit-box a.active').trigger('click');
      $(this).removeClass('active').text('编辑');

      if ( ! $('data-table>tbody tr.changed').length) {
        $('#save-data').remove();
      }
    } else {
      $('.edit-box a:not(.active)').trigger('click');
      $(this).addClass('active').text('取消');
    }

    $(this).trigger('blur');
  });

  /* data input in td */
  $(document).on('change', '.data-input', function (e) {
    $('#save-data').prop('disabled', false);
    $(this).parents('tr').addClass('changed');
  });


  // checkbox in rows
  $('.edit-box>:checkbox').click(function (e) {
    $('#del-data.btn').text('删除(' + $('.edit-box>:checkbox:checked:visible').length + ')');
    if ($(this).prop('checked'))
      $(this).parents('tr').addClass('warning');
    else
      $(this).parents('tr').removeClass('warning');
    e.stopPropagation();
  });

  /* edit single line */
  $('.edit-box>a').click(function () {
    if ($(this).is('.active')) {
      $(this).parents('tr').find('input[type=text]').each(function () {
        $(this).parent().text($(this).val());
      });

      $(this)
        .removeClass('active')
        .text('编辑');
    } else {
      $(this).parent().siblings(':gt(0):not(:has(input[type=text]))').each(function () {
        var $ele = $('<input class="data-input" type="text" value="' + $(this).text() + '" />');
        $(this).html($ele);
      });

      $(this)
        .addClass('active')
        .text('取消');
    }

    if ( ! $('#save-data').length) {
      var save_btn = '<button type="button" id="save-data" ' +
          'class="btn btn-success" disabled="disabled">保存</button>';
      $('#del-data').parent().prepend(save_btn);
    }

    $(this).trigger('blur');
    return false;
  });

  // delete data
  $('#del-data').click(function () {
    var del_list = [],
        del_keys = [];

    $('.edit-box>:checkbox:checked').each(function () {
      del_list.push($(this).parents('tr'));
      del_keys.push($(this).parent().siblings('.user').text());
    });

    /* post and show result in page */
    $.post("/del", {'data': del_keys}, function (data, status) {
      var res_msg = {
        'fail': {
          msg: '网络错误',
          type: 'danger'
        },
        'success': {
          '200': {
            msg: '成功删除' + del_list.length + '条数据',
            type: 'success'
          },
          '406': {
            msg: '数据删除失败',
            type: 'warning'
          },
          '503': {
            msg: '服务器错误',
            type: 'danger'
          },
          '403': {
            msg: '非法数据',
            type: 'danger'
          }
        }
      };

      /* insert msg box */
      var msg_box = $('#msg_box');
      if (msg_box.length) {
        update_msg_box(status, data.code, res_msg);
      } else {
        $('#edit-line').after(gen_msg_box(status, data.code, res_msg));
      }

      if (data.code == 200) {
        $.map(del_list, function (item) {
          item.remove();
        });

        $('#data-table>tbody tr').each(function (i) {
          $(this).children('.num-col').text(i + 1);
        });
      }
    }, 'json');

    $(this).trigger('blur');
  });



  /* add data page */
  // submit a record
  $('button.submit').click(function () {
    var post_data = {},
        $cur_panel = $(this).parents('.data-panel');

    $cur_panel.find('input[type=text]').each(function () {
      var field = $(this).next('input[type=hidden]').val();
      post_data[field] = $(this).val();
    });

    /* send post data */
    $.post('/add', {'data': [post_data]}, function (data, status) {
      var res_msg = {
        'fail': {
          msg: '网络错误',
          type: 'danger'
        },
        'success': {
          '200': {
            msg: '添加数据成功',
            type: 'success'
          },
          '501': {
            msg: '未知错误',
            type: 'danger'
          },
          '403': {
            msg: '非法数据',
            type: 'danger'
          }
        }
      };

      var msg_box = $('#msg_box');
      if (msg_box.length) {
        update_msg_box(status, data.code, res_msg);
      } else {
        $('#add-data-area').before(gen_msg_box(status, data.code, res_msg));
      }

      if (data['data']['success'].length) {
        $cur_panel
          .find('input[type=text]').each(function () {
            $(this).val('');
          });
      }
      if (data['data']['fail'].length) {
        $cur_panel.removeClass('panel-default').addClass('panel-danger');
      }
    });
  });

  // submit all records
  $('#submit-all').click(function () {
    var post_data = [];
    $('.data-panel').each(function () {
      var data = {},
          empty = 1;

      /* get all input data */
      $(this).find('input[type=text]').each(function () {
        var field = $(this).next('input[type=hidden]').val(),
            txt = $(this).val();
        if (txt) {
          data[field] = txt;
          empty = 0;
        }
      });
      /* skip empty data */
      if (empty) return;

      data['panel_id'] = $(this).attr('id');
      /* append to post data */
      post_data.push(data);
    });

    /* send post data */
    $.post('/add', {'data': post_data}, function (data, status) {
      var insert_res = data['data'],
          empty_panel = new_empty_panel($('#add-data-area .data-panel:first')),
          res_msg = {
            'fail': {
              msg: '网络错误',
              type: 'danger'
            },
            'success': {
              '200': {
                msg: '成功添加' + data.data.success.length + '条数据',
                type: 'success'
              },
              '501': {
                msg: '未知错误',
                type: 'danger'
              },
              '403': {
                msg: '非法数据',
                type: 'danger'
              }
            }
          };

      var msg_box = $('#msg_box');
      if (msg_box.length) {
        update_msg_box(status, data.code, res_msg);
      } else {
        $('#add-data-area').before(gen_msg_box(status, data.code, res_msg));
      }

      /* handle result */
      if (insert_res['success'].length) {
        $.map(insert_res['success'], function (x) {
          $('#' + x.panel_id)
            .removeClass('panel-default')
            .addClass('panel-success')
            .delay(1000)
            .queue(function (next) {
              /* remove successfully added panel */
              $(this).remove();

              /* if there has no panel, then insert an empty one */
              if ( ! $('#add-data-area .data-panel').length){
                $('#add-data-area>form').append(empty_panel);
              }
              next();
            });
        });
      }
      if (insert_res['fail'].length) {
        $.map(insert_res['fail'], function (x) {
          $('#' + x.panel_id).removeClass('panel-default').addClass('panel-danger');
        });
      }

      /* scroll to top */
      $("html, body").animate({ scrollTop: 0 }, 0);
    });
  });

  // add more panel button event
  $('#add-more-data').click(function () {
    $panel = new_empty_panel($('#add-data-area .data-panel:first'));
    $('#add-data-area>form').append($panel);
    $("html, body").animate({ scrollTop: $(document).height() }, 0);
    $(this).trigger('blur');
  });

  $('#add-more-data-list a').click(function () {
    var panels = [];
    for(var i = 0; i < parseInt(/\d+/.exec($(this).text())); i++) {
      panels.push(new_empty_panel($('#add-data-area .data-panel:first')));
    }
    $('#add-data-area>form').append(panels);
    $("html, body").animate({ scrollTop: $(document).height() }, 1);
    $(this).trigger('blur');
  });
});
