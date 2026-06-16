#!/bin/bash

echo -n "Entrez le nom de l'utilisateur IAM compromis (créé de manière malveillante) : "
read username

if [ "$username" == "evil_backdoor_admin" ]; then
    echo "Correct ! Voici votre flag : PCE{iam_detection_rules_2024}"
else
    echo "Incorrect. Veuillez analyser les journaux plus en détail."
fi
