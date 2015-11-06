/// <reference path="build/typings/jquery" />
/// <reference path="build/typings/jqueryui" />

// ----------------------------------------------------------------------

export interface TriggeringEvent {
    trigger(event :string, data :any) :void;
    on(event :string, callback: (data :any) => void) :JQuery;
}

export interface PopupMenuDesc
{
    items :PopupMenuDescItem[];
}

export interface PopupMenuDescItem
{
    label? :string;             // no label --> divider
    icon? :string;
    title? :boolean;             // cannot be selected
    event? :string;               // event to trigger
    eventNode? :JQuery | TriggeringEvent;           // node to trigger event on
    eventData? :any;
}

// ----------------------------------------------------------------------

export class PopupMenu
{
    private node :JQuery;
    private back :JQuery;

    constructor(desc :PopupMenuDesc) {
        this.node = $('body > .acmacs-toolkit-popup-menu');
        if (this.node.length === 0) {
            $('body').append('<div class="acmacs-toolkit-popup-menu-back"></div><ul class="acmacs-toolkit-popup-menu"></ul>');
            this.node = $('body > .acmacs-toolkit-popup-menu');
        }
        else {
            this.node.empty();
        }
        this.back = $('body > .acmacs-toolkit-popup-menu-back');
        this.back.on("click", () => this.hide());
        for (var item_no in desc.items) {
            var item = desc.items[item_no];
            var li = $('<li ' + (item.title ? 'class="acmacs-toolkit-item-title"' : '') + '>' + (item.icon ? '<span class="ui-icon ' + item.icon + '"></span>' : '') + (item.label || '-') + '</li>');
            this.node.append(li);
            if (item.event) {
                li.data({event: item.event, eventNode: item.eventNode, eventData: item.eventData});
            }
        }
    }

    public destroy() :void {
        this.hide();
        this.back.off();
        this.node.empty();
    }

    public show(parent :JQuery) :void {
        this.back.show();
        var offset = parent.offset();
        this.node.css({left: offset.left, top: offset.top});
        this.node.show();
        this.node.menu("select", (e :JQueryEventObject, ui :any) => this.clicked(ui.item));
        this.preprocess_items();
    }

    public hide() :void {
        try {
            this.node.menu("destroy");
            this.node.hide();
            this.back.hide();
        } catch (e) {
            console.log('hide err', e);
        }
    }

    private clicked(item :JQuery) :void {
        var data = item.data();
        if (data.event && data.eventNode) {
            data.eventNode.trigger(data.event, data.eventData);
        }
        this.hide();
    }

    private preprocess_items() :void {
        this.node.find('li.acmacs-toolkit-item-title').removeClass('ui-menu-item').attr('tabindex', ''); // title is not a selectable item
    }
}

// ----------------------------------------------------------------------

export class PopupMessage
{
    private node :JQuery;
    private click_handler :JQuery;

    constructor(private parent :JQuery, class_? :string) {
        var wrapper = $('<div class="acmacs-toolkit-popup-message-wrapper"><div class="acmacs-toolkit-popup-message"></div></div>').prependTo(parent);
        this.node = wrapper.find('div.acmacs-toolkit-popup-message');
        if (class_) {
            this.node.addClass(class_);
        }
    }

    public destroy() :void {
        this.hide();
        if (this.click_handler) {
            this.click_handler.off();
        }
    }

    public show(message :string, css?: any) :void {
        if (css) {
            this.node.css(css);
        }
        this.node.html(message).show();
    }

    public hide_on_click() :PopupMessage {
        if (this.click_handler) {
            this.click_handler.off();
        }
        this.click_handler = this.node.on('click', (e) => { e.stopPropagation(); this.hide() });
        return this;
    }

    public hide() :void {
        this.node.hide();
    }
}

// ----------------------------------------------------------------------
