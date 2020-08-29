/* eslint-disable react/prefer-stateless-function */
import * as React from "react";
import Dropzone from 'react-dropzone'
import { shell, ipcRenderer } from "electron";
import { Redirect } from "react-router";
import { isValidServerConfig, isValidClientConfig } from "@renderer/helpers/utils";
import "./PreDashboardView.css";
import { Config } from "@server/databases/server/entity";

interface State {
    config: Config;
    port?: string;
    abPerms: string;
    fdPerms: string;
    fcmServer: any;
    fcmClient: any;
    redirect: any;
}

class PreDashboardView extends React.Component<unknown, State> {
    constructor(props: unknown){
        super(props);

        this.state = {
            config: null,
            abPerms: "deauthorized",
            fdPerms: "deauthorized",
            fcmServer: null,
            fcmClient: null,
            redirect: null
        }
    }
    
    async componentDidMount(){
        this.checkPermissions();

        try {
            const config = await ipcRenderer.invoke("get-config");
            if (config) this.setState({ config });
            if(config.tutorial_is_done === true) {
                this.setState({redirect: "/dashboard"})
            }
        } catch (ex) {
            console.log("Failed to load database config");
        }

        ipcRenderer.on("config-update", (event, arg) => {
            this.setState({ config: arg });
        });

        console.log(this.state.config)
    }

    completeTutorial() {
        ipcRenderer.invoke("toggle-tutorial", true);
        this.setState({redirect: "/dashboard"})
    }

    openTutorialLink(){
        shell.openExternal("https://bluebubbles.app/install/index.html")
    }

    openPermissionPrompt = async () => {
        const res = await ipcRenderer.invoke("open_perms_prompt");
    };

    openAccessibilityPrompt = async () => {
        const res = await ipcRenderer.invoke("prompt_accessibility_perms");
    };

    checkPermissions = async () => {
        const res = await ipcRenderer.invoke("check_perms");
        this.setState({
            abPerms: res.abPerms,
            fdPerms: res.fdPerms
        });
    };

    handleServerFile = (acceptedFiles: any) => {
        const reader = new FileReader();

        reader.onabort = () => console.log("file reading was aborted");
        reader.onerror = () => console.log("file reading has failed");
        reader.onload = () => {
            // Do whatever you want with the file contents
            const binaryStr = reader.result;
            const valid = isValidServerConfig(binaryStr as string);
            if (!valid) return;

            ipcRenderer.invoke("set-fcm-server", JSON.parse(binaryStr as string));
            this.setState({ fcmServer: binaryStr });

            if(this.state.abPerms === "authorized" && this.state.fdPerms === "authorized" && this.state.fcmClient && this.state.fcmServer) {
                this.completeTutorial();
            }
        };

        reader.readAsText(acceptedFiles[0]);
    };

    handleClientFile = (acceptedFiles: any) => {
        const reader = new FileReader();

        reader.onabort = () => console.log("file reading was aborted");
        reader.onerror = () => console.log("file reading has failed");
        reader.onload = () => {
            // Do whatever you want with the file contents
            const binaryStr = reader.result;
            const valid = isValidClientConfig(binaryStr as string);
            if (!valid) return;

            ipcRenderer.invoke("set-fcm-client", JSON.parse(binaryStr as string));
            this.setState({ fcmClient: binaryStr });

            if(this.state.abPerms === "authorized" && this.state.fdPerms === "authorized" && this.state.fcmClient && this.state.fcmServer) {
                this.completeTutorial();
            }
        };

        reader.readAsText(acceptedFiles[0]);
    };

    render() {
        if(this.state.redirect) {
            return <Redirect to={this.state.redirect} />;
        }
        let fdPermStyles = {
            color: "red"
        };

        let abPermStyles = {
            color: "red"
        };

        if(this.state.fdPerms === "authorized"){
            fdPermStyles = {
                color: "green"
            }
        }

        if(this.state.abPerms === "authorized"){
            abPermStyles = {
                color: "green"
            }
        }

        return (
            <div id="PreDashboardView">
                <div id="welcomeOverlay">
                    <h1>Welcome</h1>
                </div>
                <div id="predashboardContainer">
                    <p id="introText">Thank you downloading BlueBubbles! In order to get started, follow the instructions outlined in <a onClick={() => this.openTutorialLink()} style={{color: "#147EFB",cursor: "pointer"}}>our installation tutorial</a></p>
                    <div id="permissionStatusContainer">
                        <h1>Required App Permissions</h1>
                            <div className="permissionTitleContainer">
                                <h3 className="permissionTitle">Full Disk Access:</h3>
                                <h3 className="permissionStatus" style={fdPermStyles} >{this.state.fdPerms === "authorized" ? "Enabled": "Disabled"}</h3>
                            </div>
                            <div className="permissionTitleContainer">
                                <h3 className="permissionTitle">Full Accessibility Access:</h3>
                                <h3 className="permissionStatus" style={abPermStyles} >{this.state.abPerms === "authorized" ? "Enabled": "Disabled"}</h3>
                            </div>                            
                    </div>
                    <h1 id="uploadTitle">Required Config Files</h1>
                    <Dropzone onDrop={acceptedFiles => this.handleServerFile(acceptedFiles)}>
                        {({getRootProps, getInputProps}) => (
                            <section id="fcmClientDrop">
                            <div {...getRootProps()}>
                                <input {...getInputProps()} />
                                <p>{this.state.fcmServer
                                    ? "FCM Client Configuration Successfully Loaded"
                                    : "Drag or click to upload FCM Server"}</p>
                            </div>
                            </section>
                        )}
                    </Dropzone>
                    <Dropzone onDrop={acceptedFiles => this.handleClientFile(acceptedFiles)}>
                        {({getRootProps, getInputProps}) => (
                            <section id="fcmServerDrop">
                            <div {...getRootProps()}>
                                <input {...getInputProps()} />
                                <p>{this.state.fcmClient
                                    ? "FCM Service Configuration Successfully Loaded"
                                    : "Drag or click to upload FCM Client (google-services.json)"}</p>
                            </div>
                            </section>
                        )}
                    </Dropzone>
                </div>
            </div>
        );
    }
}

export default PreDashboardView;
