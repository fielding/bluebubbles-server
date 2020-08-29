/* eslint-disable react/prefer-stateless-function */
import * as React from "react";
import { Link } from "react-router-dom";
import TopNav from "./TopNav/TopNav";
import LeftStatusIndicator from "./LeftStatusIndicator/LeftStatusIndicator";
import StatBox from "./StatBox";
import * as numeral from "numeral";
const QRCode = require('qrcode.react');


import "./DashboardView.css";
import { ipcRenderer } from "electron";

interface State {
    config: any;
    fcmClient: string;
    fcmClientURL: string;
    port: string;
    totalMsgCount: number;
    recentMsgCount: number;
    groupMsgCount: { name: string; count: number };
    individualMsgCount: { name: string; count: number };
    myMsgCount: number;
    imageCount: { name: string; count: number };
}

class DashboardView extends React.Component<unknown, State> {
    state: State = {
        config: null,
        fcmClient: null,
        fcmClientURL: null,
        port: null,
        totalMsgCount: 0,
        recentMsgCount: 0,
        myMsgCount: 0,
        groupMsgCount: { name: "Loading...", count: 0 },
        individualMsgCount: { name: "Loading...", count: 0 },
        imageCount: { name: "Loading...", count: 0 }
    };

    async componentDidMount() {
        const client = await ipcRenderer.invoke("get-fcm-client");
        this.setState({fcmClientURL: client.project_info.firebase_url});
        if (client) this.setState({ fcmClient: JSON.stringify(client)});

        const config = await ipcRenderer.invoke("get-config");
        if (config) this.setState({ config });
        console.log(config)
        this.loadData();
    }

    formatNumber(value: number) {
        if (value > 1000) {
            return numeral(value).format("0.0a");
        } else {
            return value;
        }
    }

    formatPhone(phone:string){
        if(phone.substr(0,1) === "+"){
            return "(" + phone.substr(2,3) + ")-" + phone.substr(5,3) + "-" + phone.substr(8,4);
        } else{
            return phone;
        }
    }

    loadData() {
        // Don't await these
        this.loadTotalMessageCount();
        this.loadRecentMessageCount();
        this.loadGroupChatCounts();
        this.loadIndividualChatCounts();
        this.loadMyMessageCount();
        this.loadChatImageCounts();
    }

    async loadGroupChatCounts() {
        try {
            const res = await ipcRenderer.invoke("get-group-message-counts");
            let top = this.state.groupMsgCount;
            res.forEach((item: any) => {
                if (item.message_count > top.count) top = { name: item.group_name, count: item.message_count };
            });

            this.setState({
                groupMsgCount: top
            });
        } catch (ex) {
            console.log("Failed to load database stats");
        }
    }

    async loadIndividualChatCounts() {
        try {
            const res = await ipcRenderer.invoke("get-individual-message-counts");
            let top = this.state.individualMsgCount;
            res.forEach((item: any) => {
                if (item.message_count > top.count)
                    top = {
                        name: item.chat_identifier,
                        count: item.message_count
                    };
            });

            this.setState({
                individualMsgCount: top
            });
        } catch (ex) {
            console.log("Failed to load database stats");
        }
    }

    async loadTotalMessageCount() {
        try {
            this.setState({
                totalMsgCount: await ipcRenderer.invoke("get-message-count")
            });
        } catch (ex) {
            console.log("Failed to load database stats");
        }
    }

    async loadChatImageCounts() {
        try {
            const res = await ipcRenderer.invoke("get-chat-image-count");
            let top = this.state.imageCount;
            res.forEach((item: any) => {
                const identifier = item.chat_identifier.startsWith("chat") ? item.group_name : item.chat_identifier;
                if (item.image_count > top.count) top = { name: identifier, count: item.image_count };
            });

            this.setState({ imageCount: top });
        } catch (ex) {
            console.log("Failed to load database stats");
        }
    }

    async loadRecentMessageCount() {
        try {
            const after = new Date();
            after.setDate(after.getDate() - 1);
            this.setState({
                recentMsgCount: await ipcRenderer.invoke("get-message-count", {
                    after
                })
            });
        } catch (ex) {
            console.log("Failed to load database stats");
        }
    }

    async loadMyMessageCount() {
        try {
            const after = new Date();
            after.setDate(after.getDate() - 1);
            this.setState({
                myMsgCount: await ipcRenderer.invoke("get-message-count", {
                    after,
                    before: null,
                    isFromMe: true
                })
            });
        } catch (ex) {
            console.log("Failed to load database stats");
        }
    }


    buildQrData = (data: string | null): string => {
        if (!data || data.length === 0) return "";

        const jsonData = JSON.parse(data);
        const output = [this.state.config?.password, this.state.config?.server_address || ""];

        output.push(jsonData.project_info.project_id);
        output.push(jsonData.project_info.storage_bucket);
        output.push(jsonData.client[0].api_key[0].current_key);
        output.push(jsonData.project_info.firebase_url);
        const client_id = jsonData.client[0].oauth_client[0].client_id;
        output.push(client_id.substr(0, client_id.indexOf("-")));
        output.push(jsonData.client[0].client_info.mobilesdk_app_id);

        return JSON.stringify(output);
    };

    render() {
        const qrData = this.buildQrData(this.state.fcmClient);

        return (
            <div id="DashboardView">
                <TopNav />
                <div id="dashboardLowerContainer">
                    <LeftStatusIndicator />
                    <div id="rightMainContainer">
                        <div id="connectionStatusContainer">
                            <div id="connectionStatusLeft">
                                <h1 className="secondaryTitle">Connection</h1>
                                <h3 className="tertiaryTitle">Server Address: <div className="infoField"><p className="infoFieldText">{this.state.config ? this.state.config.server_address : "Loading..."}</p></div></h3>
                                <h3 className="tertiaryTitle">Server Port:<div className="infoField"><p className="infoFieldText">{this.state.config ? this.state.config.socket_port : "Loading..."}</p></div></h3>
                            </div>
                            <div id="connectionStatusRight">
                                <QRCode id="activeQRCode" value={qrData} />
                            </div>
                        </div>
                        <div id="statisticsContainer">
                            <h1 className="secondaryTitle">Statistics</h1>
                            <div id="statBoxesContainer">
                                <div className="aStatBoxRow">
                                    <StatBox title={"All Time"} stat={this.formatNumber(this.state.totalMsgCount) as string}/>
                                    <StatBox title={"Top Group"} stat={this.state.groupMsgCount.name} middle={true}/>
                                    <StatBox title={"Best Friend"} stat={this.formatPhone(this.state.individualMsgCount.name)}/>
                                </div>
                                <div className="aStatBoxRow">
                                    <StatBox title={"Last 24 Hours"} stat={this.formatNumber(this.state.recentMsgCount) as string}/>
                                    <StatBox title={"Pictures"} stat={this.formatNumber(this.state.imageCount.count) as string} middle={true}/>
                                    <StatBox title={"Videos"} stat={"16"}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default DashboardView;
