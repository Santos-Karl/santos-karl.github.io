# Windows Command Reference

Run commands in Command Prompt or PowerShell. Admin rights are noted where needed.

| Command | What it does | Admin? | Changes anything? |
|---|---|---|---|
| `ipconfig` | Shows IP address, mask, and gateway | No | No |
| `ipconfig /all` | Adds DNS servers and MAC address | No | No |
| `ipconfig /flushdns` | Clears the DNS cache | No | Clears cache only |
| `ipconfig /release` then `ipconfig /renew` | Gets a new IP address from DHCP | No | Briefly drops the connection |
| `ping <address>` | Checks whether an address replies | No | No |
| `tracert <name>` | Shows the path to a destination | No | No |
| `nslookup <name>` | Asks DNS to resolve a name | No | No |
| `netstat -ano` | Lists connections and the process ID using each port | No | No |
| `arp -a` | Lists IP-to-MAC address pairs on the local network | No | No |
| `gpupdate /force` | Reapplies Group Policy now | Usually | Applies policy |
| `gpresult /r` | Shows which policies apply to this PC and user | No | No |
| `sfc /scannow` | Repairs protected system files | Yes | Repairs files |
| `DISM /Online /Cleanup-Image /RestoreHealth` | Repairs the Windows component store | Yes | Repairs store |
| `chkdsk C: /scan` | Checks the C: drive for errors without repairing | Yes | No (scan only) |
| `shutdown /r /t 0` | Restarts now | No | Restarts the PC |

Warnings:
- Read a command before you run it, especially `/R` or `/F` options on disk checks.
- `ipconfig /release` drops the connection on remote sessions.
- Take a backup or restore point before running repair commands on important machines.
