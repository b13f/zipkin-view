/**
 * Copyright 2017 Mayank Sindwani
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Zipkin-ui Browser component
 *
 * @Date : 2017-12-13
 * @Description : Trace container.
 **/

import { SetSelectedTrace } from '../../../actions/Trace';
import { FormattedMessage } from 'react-intl';
import Zipkin from '../../../util/Zipkin';
import React from 'react';

class TraceViewer extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            selectedSpan: null,
            toggleState: {}
        };
    }

    /**
     * Toggle Children
     *
     * Description: Toggles the visibility of a span's children.
     * @param e {event}     // The event object.
     * @param span {object} // The selected span.
     */
    toggleChildren(e, span) {
        e.stopPropagation();
        let toggleState = this.state.toggleState[span.id];
        if (typeof toggleState === 'undefined') {
            toggleState = true;
        }

        toggleState = !toggleState;
        this.setState({
            toggleState: {
                ...this.state.toggleState,
                [span.id] : toggleState
            }
        });
    }

    /**
     * Set Selected Span
     *
     * Description: Sets the selected span to view annotations.
     * @param e {event}     // The event object.
     * @param span {object} // The selected span.
     */
    setSelectedSpan(e, span) {
        if (this.state.selectedSpan === span) {
            // Toggle the current span.
            span = null;
        }
        this.setState({ selectedSpan : span });
    }

    /**
     * Build Heirarchy
     *
     * Description: Builds the tree hierarchy for a trace.
     * @returns {array} // the tree for the trace.
     */
    buildHeirarchy() {
        const spanLookup = {};
        const roots = [];

        this.props.trace.forEach(span => {
            spanLookup[span.id] = span;
            span._children_ = [];
            if (typeof span.parentId === 'undefined') {
                roots.push(span);
            }
        });

        this.props.trace.forEach(span => {
            const parent = spanLookup[span.parentId];
            if (typeof parent !== 'undefined') {
                parent._children_.push(span);
            }
        });

        return roots;
    }

    /**
     * Get Table Headers
     *
     * Description: Returns the set of headers for the trace table.
     * @returns {array} // the set of headers.
     */
    getTableHeaders() {
        const headers = [ 'Service', '' ];
        const trace = this.props.trace;
        const interval = Zipkin.GetTraceDuration(trace)/5;

        for (let i = 1; i <= 5; i++) {
            headers.push(`${(interval*i).toFixed(3)}s`);
        }

        return headers.map((header, i) => {
            return (<th key={i}>{header}</th>);
        });
    }

    /**
     * Get Table Rows
     *
     * Description: Returns the set of rows for the trace table.
     * @param spans {array}    // The set of spans to render.
     * @param numHeaders {int} // The number of headers.
     * @param startTs (int)    // The starting timestamp
     * @returns {array}        // the set of rows.
     */
    getTableRows(spans, numHeaders, startTs) {
        const duration = Zipkin.GetTraceDuration(this.props.trace);
        const rows = [];
        let key = 0;

        while (spans.length > 0) {
            const span = spans.shift();
            let depth = 0;
            if (typeof span._depth_ !== 'undefined') {
                depth = span._depth_;
            }

            const emptyCells = [];
            for (let i = numHeaders - 2; i > 0; i--) {
                emptyCells.push((<td key={i}></td>));
            }

            const left = ((span.timestamp - startTs) / 1000000) *(numHeaders - 1)*100  + '%';
            const width = (span.duration/1000000/duration) * 100 *(numHeaders - 1) + '%';
            const collapsed = this.state.toggleState[span.id] === false;

            rows.push((
                <tr onClick={e => this.setSelectedSpan(e, span)} key={key++}>
                    <td>
                        <div style={{ marginLeft: depth*10 }} className="zk-ui-trace-service-name">
                            { span._children_.length ?
                                <i
                                    onClick={e => this.toggleChildren(e, span)}
                                    className={`fa fa-${collapsed ? 'plus' : 'minus'}`} /> :
                                <i className="fa fa-minus hidden"></i> }
                            <span>{Zipkin.GetSpanService(span)}</span>
                        </div>
                    </td>
                    <td>
                        <div className="zk-ui-trace-span" style={{ marginLeft: left, width: width }}></div>
                        <div className="zk-ui-trace-span-name" style={{ marginLeft: left }}>
                            {`${span.name} - ${Zipkin.DurationToString(span.duration)}`}
                        </div>
                    </td>
                    { emptyCells }
                </tr>
            ));

            if (span === this.state.selectedSpan) {
                rows.push((
                    <tr className="zk-ui-trace-span-context-row" key={'selected-span'}>
                        <td colSpan={numHeaders}>
                            <div className="zk-ui-trace-span-context">
                                <table className="zk-ui-trace-span-context-table">
                                    <tbody>
                                        <tr>
                                            <td className="header">Annotation</td>
                                            <td className="header">Date Time</td>
                                            <td className="header">Relative Time</td>
                                            <td className="header">Address</td>
                                        </tr>
                                        {
                                            span.annotations.map((annotation, i) => {
                                                let endpoint = annotation.endpoint.ipv4;
                                                if (annotation.endpoint.port) {
                                                    endpoint += `:${annotation.endpoint.port}`;
                                                }
                                                return (
                                                    <tr key={i}>
                                                        <td>
                                                            <FormattedMessage
                                                                id={annotation.value} />
                                                        </td>
                                                        <td>
                                                            {Zipkin.ConvertTimestampToDate(annotation.timestamp)}
                                                        </td>
                                                        <td>
                                                            {Zipkin.DurationToString(annotation.timestamp - startTs)}
                                                        </td>
                                                        <td>
                                                            {`${endpoint} (${annotation.endpoint.serviceName})`}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        }
                                        <tr>
                                            <td className="header">Key</td>
                                            <td className="header">Value</td>
                                        </tr>
                                        {
                                            span.binaryAnnotations.map((annotation, i) => {
                                                return (
                                                    <tr key={i}>
                                                        <td>{annotation.key}</td>
                                                        <td>{annotation.value}</td>
                                                    </tr>
                                                );
                                            })
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </td>
                    </tr>
                ));
            }

            depth++;

            if (!collapsed) {
                span._children_.forEach(child => {
                    child._depth_ = depth;
                    spans.unshift(child);
                });
            }
        }

        return rows;
    }

    /**
     * On Back Click
     *
     * Description: Handler for when the back button is clicked.
     */
    onBackClicked() {
        SetSelectedTrace(null);
        this.props.history.goBack();
    }

    render() {
        const spans = this.buildHeirarchy();
        const headers = this.getTableHeaders();
        const rows = this.getTableRows(spans, headers.length, spans[0].timestamp);

        return (
            <div className="zk-ui-trace-viewer">
                <div className="zk-ui-trace-viewer-container">
                    <div className="zk-ui-card">
                        <div className="zk-ui-card-header">
                            <div onClick={e => this.onBackClicked(e)} className="zk-ui-button">
                                <i className="fa fa-arrow-left"></i>{' '}<span>Back</span>
                            </div>
                        </div>
                        <div className="zk-ui-card-content">
                            <table className="zk-ui-trace-table">
                                <thead>
                                    <tr>
                                        { headers }
                                    </tr>
                                </thead>
                                <tbody>
                                    { rows }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default TraceViewer;