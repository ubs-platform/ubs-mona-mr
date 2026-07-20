pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        string(name: 'VERSION', defaultValue: '', description: 'Version number (for example 1.0.0). Leave empty to derive from a v* branch.')
        string(name: 'VERSION_TAG', defaultValue: '', description: 'Optional version tag to write into package.json.')
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
                sh 'npm ci'
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

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
NODE
                '''
            }
        }

        stage('Publish libraries') {
            steps {
                withCredentials([string(credentialsId: 'npm-token', variable: 'NODE_AUTH_TOKEN')]) {
                    sh 'npm run xr publish-libs'
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
                    git config user.name "jenkins"
                    git config user.email "jenkins@users.noreply.github.com"
                    git add .
                    git commit -m "Version upgrade to ${RELEASE_VERSION} and publish completion" || echo "No changes to commit"
                    git push origin HEAD:${BRANCH_NAME} || echo "Nothing to push"
                '''
            }
        }
    }
}