# Cost Allocation Tags

This project implements a standardized tagging schema across our AWS infrastructure to facilitate tracking, management, and cost visibility. These AWS Cost Allocation Tags are defined centrally in `infra/app.py` via the AWS CDK. 

Because we apply these tags at the application and stack level, the CDK automatically propagates them down to all underlying compute, storage, request-based, and networking resources.

## Global Tags
The following tags are applied universally to **all** resources in the `app`:

*   **`Project`**: `SentinelNet`
*   **`Environment`**: `Dev`
*   **`Tenant`**: `Shared`

## Service-Specific Tags
To grant us granular visibility into the cost centers of the project, we apply the `Service` tag to group specific AWS resources by their functional domain:

| `Service` Tag | Associated Stacks | Description |
| :--- | :--- | :--- |
| **`Frontend`** | `website_stack` | Resources serving the user-facing SPA (CloudFront, S3 Bucket, Cognito). |
| **`Backend`** | `backend_stack`, `user_data_stack` | Resources powering the application logic and databases (Wazuh, ECS TheHive/Grafana, RDS, DynamoDB, API Gateways, Lambdas). |
| **`Infra`** | `network_stack`, `appregistry_stack` | Fundamental networking and orchestration resources (VPC, NAT Gateways, EIPs). |

## Tracking Costs
To view your project expenditures based on these tags:
1. Ensure the tag keys (`Project`, `Environment`, `Tenant`, `Service`) are explicitly marked as "Active" in the AWS Cost Allocation Tags console.
2. Use AWS Cost Explorer to filter or group by these tags (results generally populate 24-48 hours after activation).
