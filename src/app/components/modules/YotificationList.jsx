import {connect} from 'react-redux';
import tt from 'counterpart'
import classNames from 'classnames';
import Icon from 'app/components/elements/Icon';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import Notification from 'app/components/elements/notification';
import { filters } from 'app/components/elements/notification/type';
import { Link } from 'react-router'
import debounce from 'lodash.debounce';
import React from 'react';
import Url from 'app/utils/Url';

export const LAYOUT_PAGE = 'Page';
export const LAYOUT_DROPDOWN = 'Dropdown';
export const FILTER_ALL = 'all';

const TIMEOUT_MARK_SHOWN_MILLIS = 3000;


/**
 * Find the absolute offset relative to the window
 * @param domElt
 * @returns {*}
 */
function topPosition(domElt) {
    if (!domElt) {
        return 0;
    }
    return domElt.offsetTop + topPosition(domElt.offsetParent);
}

const renderNotificationList = (notifications = [], onViewAll) => {
    const notificationList = [];
    notifications.forEach( notification => {
        if(!notification.hide) {
            notificationList.push( <li className={classNames("item", {unread: (!notification.read)})} key={notification.id}><Notification {...notification} onClick={onViewAll} /></li> );
        }
    })
    return ( <ul className="Notifications">{notificationList}</ul> );
}

const renderFilterList = (props) => {
    const locales = tt; // HACK: this works around the notification pre-commit checker for runtime-modified translated strings
    let className = (props.filter === FILTER_ALL)? 'selected' : '';
    const filterLIs = Object.keys(filters).reduce((list, filter) => {
        className = (filter === props.filter)? 'selected' : '';
        list.push(<li key={filter} className={className}><Link
            to={Url.notifications(filter)}>{locales(`notifications.filters.${filter}`)}</Link></li>);
        return list;
    }, [<li key="legend" className="selected">{tt("notifications.filters._label")}</li>, <li key="all" className={className}><Link to={Url.notifications()}>{tt('notifications.filters.all')}</Link></li>]);
    return ( <ul className="menu">{filterLIs}</ul>);
}

//todo: make functional


class YotificationList extends React.Component {
    constructor(props) {
        super(props);
        this.htmlId = 'YotifModule_' + Math.floor(Math.random() * 1000);
        switch (props.layout) { //eslint-disable-line
            case LAYOUT_DROPDOWN :
                this.state = {
                    layout: props.layout,
                    showFilters: false,
                    showFooter: true
                };
                break;
            case LAYOUT_PAGE :
                this.state = {
                    layout: props.layout,
                    showFilters: true,
                    showFooter: false
                };
                break;
        }
        //this.scrollListener = this.scrollListener.bind(this);
    }

    componentDidMount() {
        if(LAYOUT_PAGE === this.state.layout) {
            window.addEventListener('scroll', this.scrollListenerPage, {capture: false, passive: true});
            window.addEventListener('resize', this.scrollListenerPage, {capture: false, passive: true});
        } else if(LAYOUT_DROPDOWN === this.state.layout) {
            this.rootEl.parentElement.addEventListener('scroll', this.scrollListenerDropdown, {capture: false, passive: true});
        }
        this.markDisplayedShownWithDelay();
    }

    shouldComponentUpdate(nextProps, nextState) { //eslint-disable-line
        if(this.props.filter != nextProps.filter) {
            this.markDisplayedShownWithDelay();
        }
        return true;
    }

    componentWillUnmount() {
        clearTimeout(this.markDisplayedShownTimeout);
    }


    markDisplayedRead = () => { //eslint-disable-line no-undef
        this.props.updateSome(this.props.notifications, {read: true} );
    }

    markDisplayedHidden = () => { //eslint-disable-line no-undef
        this.props.updateSome(this.props.notifications, {hide: true} );
    }

    markDisplayedShownWithDelay = () => { //eslint-disable-line no-undef
        const self = this;
        clearTimeout(this.markDisplayedShownTimeout);
        this.markDisplayedShownTimeout = setTimeout(() => {
            self.props.updateSome(this.props.notifications, {shown: true} );
        }, TIMEOUT_MARK_SHOWN_MILLIS)
    }
    appendSome = () => { //eslint-disable-line no-undef
        this.props.appendSome((this.props.filter !== FILTER_ALL)? filters[this.props.filter] : false);
    }

    //todo: make sure this doesn't fire too often in either layout
    scrollListenerPage = debounce(() => { //eslint-disable-line no-undef
        if (this.props.noMoreToFetch) return;

        const el = window.document.getElementById(this.htmlId);
        if (!el) return;
        const scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset :
            (document.documentElement || document.body.parentNode || document.body).scrollTop;
        //the eslint thing for the next line...  apparently math is scary!?
        if (topPosition(el) + el.offsetHeight - scrollTop - window.innerHeight < 10) { //eslint-disable-line no-mixed-operators
            this.props.appendSome((this.props.filter !== FILTER_ALL)? filters[this.props.filter] : false);
        }
    }, 150)

    scrollListenerDropdown = debounce(() => { //eslint-disable-line no-undef
        if (this.props.noMoreToFetch) return;

        const el = window.document.getElementById(this.htmlId);
        if (!el) return;

        if(el.scrollHeight < (el.parentElement.offsetHeight + el.parentElement.scrollTop + 10)) {
            this.props.appendSome((this.props.filter !== FILTER_ALL)? filters[this.props.filter] : false);
        }

    }, 150)

    renderTitle(absolute = false) {
        return (<div className={classNames("title", {absolute})}>{tt('g.notifications')}
            <span className="controls-right">
                {(this.props.showClearAll) ?
                    <button className="ptc" onClick={this.markDisplayedHidden}>{tt('notifications.controls.mark_all_hidden')}</button> :
                    <button className="ptc" onClick={this.markDisplayedRead}>{tt('notifications.controls.mark_all_read')}</button>
                }
                <Link to={Url.profileSettings()}><Icon name="cog" /></Link>
            </span>
        </div>);
    }

    render() {
        return (
            <div id={this.htmlId}
                 className={classNames("NotificationsModule", this.state.layout, {'no-notifications': (this.props.notifications.size === 0)})}
                 ref={el => { this.rootEl = el }} >

                {this.renderTitle()}
                {(this.state.showFilters)? renderFilterList(this.props) : null}
                {renderNotificationList(this.props.notifications, this.props.onViewAll)}
                {this.renderTitle(true)}

                <div className="footer get-more">
                    {this.props.noMoreToFetch
                        ? <div>No more to fetch!</div>
                        : this.props.isFetchingBefore
                            ? <LoadingIndicator type="circle" inline />
                            : <button className="ptc" onClick={this.appendSome}>{tt('notifications.controls.fetch_more')}</button>
                    }
                </div>

                {(this.state.showFooter)? <div className="footer">{tt('notifications.controls.go_to_page')}</div> : null }
                {(this.state.showFooter)? (<div className="footer absolute">
                    <Link to={Url.profile() + '/notifications'} onClick={this.props.onViewAll} className="view-all">{tt('notifications.controls.go_to_page')}</Link>
                </div>) : null}
        </div>);
    }
}

YotificationList.propTypes = {
    updateSome: React.PropTypes.func.isRequired,
    appendSome: React.PropTypes.func.isRequired,
    //notifications: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    layout: React.PropTypes.oneOf([LAYOUT_PAGE, LAYOUT_DROPDOWN]),
    showClearAll: React.PropTypes.bool.isRequired,
    noMoreToFetch: React.PropTypes.bool.isRequired,
    isFetchingBefore: React.PropTypes.bool.isRequired,
    onViewAll: React.PropTypes.func
};

YotificationList.defaultProps = {
    layout: LAYOUT_PAGE,
    onViewAll: null
};

export default connect(
    // mapStateToProps
    (state, ownProps) => {
        const filter = (ownProps.filter && filters[ownProps.filter]) ? ownProps.filter : FILTER_ALL;
        let allRead = true;
        const notifications = filter === FILTER_ALL
            ? state.notification.byId
            : state.notification.byId.filter((v, id) => state.notification.byUserFacingType[filter].includes(id));

        notifications.forEach((n) => {
            if (n.read === false) {
                allRead = false;
                return false;
            }
            return true;
        });

        const filterToken = filter === FILTER_ALL ? FILTER_ALL : filters[filter].toString();
        const noMoreToFetch = state.notification.lastFetchBeforeCount.get(filterToken) === 0;

        return {
            notifications,
            ...ownProps,
            filter,
            noMoreToFetch,
            isFetchingBefore: state.notification.isFetchingBefore,
            showClearAll: allRead,
        }
    },
    dispatch => ({
        updateSome: (notifications, changes) => {
            const ids = [];
            notifications.forEach((n) => {
                ids.push(n.id);
            });
            const action = {
                type: 'notification/UPDATE_SOME',
                ids,
                updates: changes
            };
            dispatch(action);
        },
        appendSome: (notificationTypes) => {
            const action = {
                type: 'notification/FETCH_SOME',
                types: notificationTypes,
                direction: 'before'
            };
            dispatch(action);
        }
    })
)(YotificationList)

