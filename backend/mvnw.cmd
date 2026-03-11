@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script, version 3.2.0
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "BASE_DIR=%~dp0")

@SET MAVEN_PROJECTBASEDIR=%BASE_DIR%
@IF NOT "%MAVEN_BASEDIR%"=="" SET MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
@IF NOT DEFINED MAVEN_PROJECTBASEDIR SET MAVEN_PROJECTBASEDIR=%BASE_DIR%

@SET WRAPPER_DIR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper
@SET WRAPPER_PROPERTIES=%WRAPPER_DIR%\maven-wrapper.properties
@SET DOWNLOAD_URL=

@FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%WRAPPER_PROPERTIES%") DO (
    @IF "%%A"=="distributionUrl" SET DISTRIBUTION_URL=%%B
    @IF "%%A"=="wrapperUrl" SET DOWNLOAD_URL=%%B
)

@SET MAVEN_WRAPPER_JAR=%WRAPPER_DIR%\maven-wrapper.jar
@IF NOT EXIST "%MAVEN_WRAPPER_JAR%" (
    @IF NOT "%DOWNLOAD_URL%"=="" (
        powershell -Command "&{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%DOWNLOAD_URL%', '%MAVEN_WRAPPER_JAR%')}"
    )
)

@SET JAVACMD=java
@IF DEFINED JAVA_HOME SET JAVACMD="%JAVA_HOME%\bin\java"

@SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain
@SET WRAPPER_JAR="%MAVEN_WRAPPER_JAR%"

@IF EXIST "%MAVEN_WRAPPER_JAR%" (
    @%JAVACMD% %MAVEN_OPTS% -classpath %WRAPPER_JAR% "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
) ELSE (
    @ECHO Error: Maven wrapper JAR not found. Download it first.
    @EXIT /B 1
)
