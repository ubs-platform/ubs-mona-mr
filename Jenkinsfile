pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    variable {
        APPLICATION_NAME = 'UBS Mona Platform'
    }

    parameters {
        string(name: 'VERSION', defaultValue: '', description: 'Version number (for example 1.0.0). Leave empty to derive from a v* branch.')
        string(name: 'VERSION_TAG', defaultValue: '', description: 'Optional version tag to write into package.json.')
        booleanParam(name: 'SKIP_LIB_PUBLISH', defaultValue: false, description: 'Skip the Publish libraries stage (useful when re-releasing the same version).')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Resolve version') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME ?: ''
                    def suppliedVersion = params.VERSION?.trim()

                    if (suppliedVersion) {
                        env.RELEASE_VERSION = suppliedVersion
                    } else if (branchName.startsWith('v')) {
                        env.RELEASE_VERSION = branchName.substring(1)
                    } else {
                        error('Provide VERSION or run the job from a branch that starts with v.')
                    }

                    env.RELEASE_VERSION_TAG = params.VERSION_TAG?.trim()
                }
            }
        }

        stage('Install dependencies') {
            steps {
                // sh 'npm ci'
                sh 'npm install --force --legacy-peer-deps --no-audit --no-fund'
            }
        }

        stage('Update package.json') {
            steps {
                sh '''
node <<'NODE'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

packageJson.version = process.env.RELEASE_VERSION;

if (process.env.RELEASE_VERSION_TAG) {
    packageJson.childrenVersionTag = process.env.RELEASE_VERSION_TAG;
}

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\\n');
NODE
                '''
            }
        }

        stage('Publish libraries') {
            when {
                expression { return !params.SKIP_LIB_PUBLISH }
            }
            steps {
                withCredentials([string(credentialsId: 'npm-token', variable: 'NODE_AUTH_TOKEN')]) {
                    sh 'npm config set //registry.npmjs.org/:_authToken=$NODE_AUTH_TOKEN; npm run xr publish-libs'
                }
            }
        }

        stage('Docker login') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh 'echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin'
                }
            }
        }

        stage('Release all apps') {
            steps {
                sh './tools/release-all-apps.sh'
            }
        }

        stage('Commit version changes') {
            steps {
                sh '''
                    git config user.name "Hüseyin Can Gündüz"
                    git config user.email "hcangunduz@gmail.com"
                    git add .
                    git commit -m "JENKINS: Version upgrade to ${RELEASE_VERSION} and publish completion" || echo "No changes to commit"
                    git push origin HEAD:${BRANCH_NAME} || echo "Nothing to push"
                '''
            }
        }


// if not provided, it will skip the notification stage
        stage('Telegram Notification') {
            steps {
                withCredentials([
                    string(credentialsId: 'telegram-bot-token', variable: 'TELEGRAM_BOT_TOKEN'),
                    string(credentialsId: 'telegram-chat-id', variable: 'TELEGRAM_CHAT_ID')
                    ]) {
                    sh '''
                        if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
                            echo "Telegram bot token or chat ID is not set. Skipping notification."
                            exit 0
                        fi
                        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
                        -d chat_id="$TELEGRAM_CHAT_ID" \
                        -d text="${APPLICATION_NAME} - Release completed successfully for version ${RELEASE_VERSION}."
                    '''
                }
            }
        }

        // stage if failed, send notification to telegram
        post {
            failure {
                withCredentials([
                    string(credentialsId: 'telegram-bot-token', variable: 'TELEGRAM_BOT_TOKEN'),
                    string(credentialsId: 'telegram-chat-id', variable: 'TELEGRAM_CHAT_ID')
                    ]) {
                    sh '''
                        if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
                            echo "Telegram bot token or chat ID is not set. Skipping notification."
                            exit 0
                        fi
                        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
                        -d chat_id="$TELEGRAM_CHAT_ID" \
                        -d text="${APPLICATION_NAME} - Release failed for version ${RELEASE_VERSION}. Please check the Jenkins job for details."
                    ''' 
                    }
            }
        }
    }
}