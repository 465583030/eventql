ZBase.registerView((function() {
  var path_prefix = "/a/session_tracking/settings/schema/events/";
  var event_name;

  var init = function(path) {
    event_name = path.substr(path_prefix.length);
    load();
  };

  var load = function() {
    $.showLoader();

    var page = $.getTemplate(
        "views/session_tracking",
        "zbase_session_tracking_main_tpl");

    var menu = SessionTrackingMenu(path_prefix);
    menu.render($(".zbase_content_pane .session_tracking_sidebar", page));

    var content = $.getTemplate(
        "views/session_tracking",
        "zbase_session_tracking_edit_event_tpl");

    $(".zbase_content_pane .session_tracking_content", page).appendChild(content);

    var info_url = "/api/v1/session_tracking/event_info?event=" + event_name;
    $.httpGet(info_url, function(r) {
      if (r.status == 200) {
        render(JSON.parse(r.response).event.schema.columns);
      } else {
        $.fatalError();
      }
      $.hideLoader();
    });

    $("h3 span", page).innerHTML = event_name;

    $.onClick($("button.add_field", page), function(e) {renderAdd("")});

    $.handleLinks(page);
    $.replaceViewport(page);
  };

  var render = function(fields) {
    renderTable(fields, $(".zbase_session_tracking table.edit_event tbody"));
  };

  var renderTable = function(fields, tbody) {
    var row_tpl = $.getTemplate(
        "views/session_tracking",
        "zbase_session_tracking_edit_event_row_tpl");

    var table_tpl = $.getTemplate(
        "views/session_tracking",
        "zbase_session_tracking_edit_event_table_tpl");


    var delete_modal = $(".zbase_session_tracking z-modal.delete_field");
    $.onClick($("button.close", delete_modal), delete_modal.close);
    $.onClick($("button.submit", delete_modal), function(e) {deleteField()});

    fields.forEach(function(field) {
      var html = $("tr", row_tpl.cloneNode(true));
      $(".name", html).innerHTML = field.name;
      $(".type", html).innerHTML = "[" + field.type.toLowerCase() + "]";
      tbody.appendChild(html);

      if (field.repeated) {
        var table = table_tpl.cloneNode(true);
        renderTable(field.schema.columns, $("tbody", table));
        tbody.appendChild(table);
      }

      $("z-dropdown", html).addEventListener("change", function() {
        switch (this.getValue()) {
          case "add":
            renderAdd(field.name + ".");
            break;

          case "delete":
            deleteField.bind(null, field.name)();
            delete_modal.show();
            break;
        };
        this.setValue([]);
      }, false);

    });
  };

  var renderAdd = function(field_prefix) {
    var modal = $(".zbase_session_tracking z-modal.add_field");
    var tpl = $.getTemplate(
        "views/session_tracking",
        "zbase_session_tracking_add_event_modal_tpl");

    var input = $("input", tpl);
    input.value = field_prefix;

    $.onClick($("button.submit", tpl), function() {
      if (input.value.length == 0) {
        input.classList.add("error");
        $(".error_note", modal).classList.remove("hidden");
        return;
      }

      var field_data = {
        event: event_name,
        field: $.escapeHTML(input.value),
        type: $("z-dropdown", modal).getValue(),
        repeated: $("z-checkbox", modal).hasAttribute("data-active"),
        optional: true
      };

      var url =
          "/a/session_tracking/events/add_field?" +
          $.buildQueryString(field_data);

      $.httpPost(url, "", function(r) {
        if (r.status == 200) {
          load();
        } else {
          $.fatalError();
        }
      });
    });

    $.replaceContent($(".container", modal), tpl);

    modal.show();
    input.focus();
  };

  var deleteField = function(field_name) {
    //TODO render popup
    console.log(field_name);
    return;
    
    var url =
        "/a/session_tracking/events/remove_field?event=" +
        event_name + "field=" + field_name;

    $.httpPost(url, "", function(r) {
      if (r.status == 201) {
        load();
      } else {
        $.fatalError();
      }
    });
  };


  return {
    name: "edit_session_tracking_event",
    loadView: function(params) { init(params.path); },
    unloadView: function() {},
    handleNavigationChange: init
  };
})());
