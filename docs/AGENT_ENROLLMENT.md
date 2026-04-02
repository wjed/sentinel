# SentinelNet — Agent Enrollment Guide

To see live alerts in your dashboard, you need at least one machine (an "Agent") reporting to your Manager.

## 1. Get your Manager IP
After running `./deploy-all.sh`, look at the outputs for `SentinelNet-Backend`.
Copy the **`ManagerPublicIP`**.

## 2. Install the Agent (Windows)
Run this in **PowerShell as Administrator**:

```powershell
# 1. Download and install
Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-4.9.2-1.msi -OutFile wazuh-agent.msi
msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER='REPLACE_WITH_MANAGER_IP' WAZUH_REGISTRATION_SERVER='REPLACE_WITH_MANAGER_IP'

# 2. Start the service
Net-Start Wazuh
```

## 3. Install the Agent (Linux - Ubuntu/Debian)
Run this as **root**:

```bash
# 1. Install Wazuh repo
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
apt-get update

# 2. Install agent
WAZUH_MANAGER="REPLACE_WITH_MANAGER_IP" apt-get install wazuh-agent

# 3. Enable and start
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent
```

---

## 🏎 How to Trigger an Alert
Once the agent is active (takes ~1-2 mins to show up in the manager), try to trigger a standard alert:

1. **Failed SSH Login**: Try to SSH into the machine with a wrong password 3-5 times.
2. **Check Dashboard**: Navigate to the **Alerts** page on your SentinelNet website. 
3. **Verified**: You should see a "Wazuh: Authentication failure" alert pop up!
